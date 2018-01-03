const Utils = require('./lib/utils.js')
const BigNumber = require('bignumber.js')

// Properties
// Add
// 		fails to add as non-owner
// 		adds as owner
// Approve
// 		fails to approve as non-STOwner
// 		approves as STOwner
// Process
//		with completion
// 			fails to process as non-owner
// 			fails to process as owner when approved but not allowed
// 			processes as owner when approved and allowed
// 			fails to process as owner when completed
//		with disapproval
//			fails to process as owner when disapproved
// Disapprove
// 		fails to disapprove as non-STOwner
// 		disapproves as STOwner

contract('Bonuses', function(accounts) {
	var bonuses = null;
	var addresses = [];

	const ST1M 	 	  = new BigNumber(web3.toWei(1000000, "ether"));
	const totalSupply = new BigNumber(web3.toWei(800000000, "ether"));
	const bonus2 	  = { address: accounts[2], amount: new BigNumber(web3.toWei(2, "ether")) };
	const bonus3 	  = { address: accounts[3], amount: new BigNumber(web3.toWei(3, "ether")) };
	const bonus4 	  = { address: accounts[4], amount: new BigNumber(web3.toWei(4, "ether")) };

	describe('properties', async () => {
		before(async () => {
	        contracts = await Utils.deployBonuses(artifacts, accounts);
	        token = contracts.token;
	        bonuses = contracts.bonuses;
		})

		it ('has simpleToken', async () => {
			assert.equal(await bonuses.simpleToken.call(), token.address);
		})
	})

	describe('add function', async () => {
		before(async () => {
	        contracts = await Utils.deployBonuses(artifacts, accounts);
	        bonuses = contracts.bonuses;
		})

		it ('fails to add as non-owner', async () => {
            await Utils.expectThrow(bonuses.add(bonus2.address, bonus2.amount, { from: accounts[1] }));
		})

		it ('adds as owner', async () => {
			var remaining = await bonuses.remainingTotalBonuses.call();

            assert.equal(await bonuses.add.call(bonus2.address, bonus2.amount, { from: accounts[0] }), true);
            var result = await bonuses.add(bonus2.address, bonus2.amount, { from: accounts[0] });
            Utils.checkBonusEvent(result.logs[0], "BonusAdded", bonus2.address, bonus2.amount);

            assert.equal(await bonuses.add.call(bonus3.address, bonus3.amount, { from: accounts[0] }), true);
            result = await bonuses.add(bonus3.address, bonus3.amount, { from: accounts[0] });
            Utils.checkBonusEvent(result.logs[0], "BonusAdded", bonus3.address, bonus3.amount);

            var newRemaining = await bonuses.remainingTotalBonuses.call();
            assert.equal(newRemaining.toNumber(), remaining.plus(bonus2.amount).plus(bonus3.amount).toNumber());
		})
	})

	describe('approve function', async () => {
		before(async () => {
	        contracts = await Utils.deployBonuses(artifacts, accounts);
	        bonuses = contracts.bonuses;
	        await bonuses.add(bonus2.address, bonus2.amount, { from: accounts[0] });
			await bonuses.lock({ from: accounts[0] });	        
		})

		it ('fails to approve as non-STOwner', async () => {
            await Utils.expectThrow(bonuses.approve({ from: accounts[0] }));
		})

		it ('approves as STOwner', async () => {
			var status = await bonuses.status.call();
			assert.equal(status.toNumber(), 1);

			var result = await bonuses.approve({ from: accounts[1] });

			status = await bonuses.status.call();
			assert.equal(status.toNumber(), 2);
		})
	})

	describe('process function', async () => {
		context('with completion', async () => {
			before(async () => {
		        contracts = await Utils.deployBonuses(artifacts, accounts);
		        token = contracts.token;
		        bonuses = contracts.bonuses;

				var addressesPalette = _.range(1,9);

				console.log(":: ADDING BONUSES ::");

				for (var i = 0; i < addressesPalette.length; i++) {
					for(var t = 0; t < addressesPalette.length; t++) {
						for(var e = 0; e < addressesPalette.length; e++) {
							if (i == 0 && t == 0 && e == 0) continue;

							var address = "0x" + i + t;
							_.times(38, function() { address = address + e });

					        await bonuses.add(address, ST1M, { from: accounts[0] });
							addresses.push(address);
						}
					}
				}

				await bonuses.lock({ from: accounts[0] });
				await bonuses.approve({ from: accounts[1] });
			})

			it ('is setup to process bonuses', async () => {
				var size = await bonuses.getAddressesSize.call();
				assert.equal(size.toNumber(), 511);

				var remaining = await bonuses.remainingTotalBonuses.call();
				assert.equal(remaining.toNumber(), ST1M.times(511));

				var status = await bonuses.status.call();
				assert.equal(status.toNumber(), 2);			
			})

			it ('fails to process as non-owner', async () => {
	            await Utils.expectThrow(bonuses.process(0, { from: accounts[1] }));
			})

			it ('fails to process as owner when approved but not allowed', async () => {
	            await Utils.expectThrow(bonuses.process(0, { from: accounts[0] }));
			})

			it ('processes as owner when approved and allowed', async () => {
				console.log(":: PROCESSING BONUSES ::");

				var remaining = await bonuses.remainingTotalBonuses.call();
				await token.approve(bonuses.address, remaining.toNumber(), { from: accounts[1] });

				var simResult 	= null;
				var result 		= null;
				var log 		= null;
				var from 		= 0;
				var to 			= 0;
				var event 		= "BonusProcessed";
				var bonus 		= null;
				var index 		= null;
				var balance 	= null;

				while (to < (addresses.length - 1)) {
					simResult = await bonuses.process.call(from, { from: accounts[0] });
					result    = await bonuses.process(from, { from: accounts[0] });

					for (var i = from; i <= to; i++) {
						Utils.checkBonusEvent(result.logs[i - from], "BonusProcessed", addresses[from], ST1M);
					}

					to = simResult.toNumber();
					from = to + 1;

					// Confirm that the last processed bonus is marked processed
					lastBonus = await bonuses.processables.call(addresses[to]);
					assert.equal(lastBonus[1], true);

					// Confirm that the next bonus to process is marked !processed
					if (from < addresses.length) {
						nextBonus = await bonuses.processables.call(addresses[from]);
						assert.equal(nextBonus[1], false);
					}

					totalTransferred = ST1M.times(from);

					// Confirm that remainingTotalBonuses is correctly decreased
					remaining = await bonuses.remainingTotalBonuses.call();
					assert.equal(remaining.toNumber(), ST1M.times(511).sub(totalTransferred).toNumber());

					// Confirm that SimpleToken.owner balance is correctly decreased
					balance = await token.balanceOf.call(accounts[1]);
					assert.equal(balance.toNumber(), totalSupply.sub(totalTransferred).toNumber());
				}
				assert.equal(_.last(result.logs).event, "Completed");

				var status = await bonuses.status.call();
				assert.equal(status.toNumber(), 3);			

				// Confirm that final bonus is marked processed
				lastBonus = await bonuses.processables.call(addresses[to]);
				assert.equal(lastBonus[1], true);				

				// Confirm that remainingTotalBonuses is 0
				remaining = await bonuses.remainingTotalBonuses.call();
				assert.equal(remaining.toNumber(), 0);

				// Confirm that SimpleToken.owner balance is correctly decreased
				balance = await token.balanceOf.call(accounts[1]);
				assert.equal(balance.toNumber(), totalSupply.sub(ST1M.times(511)).toNumber());
			})

			it ('fails to process as owner when completed', async () => {
	            await Utils.expectThrow(bonuses.process(0, { from: accounts[0] }));
			})
		})

		context('with disapproval', async () => {
			before(async () => {
		        contracts = await Utils.deployBonuses(artifacts, accounts);
		        bonuses = contracts.bonuses;
		        await bonuses.add(bonus2.address, bonus2.amount, { from: accounts[0] });
				await bonuses.lock({ from: accounts[0] });
				await bonuses.approve({ from: accounts[1] });
			})

			it ('fails to process as owner', async () => {
	            await Utils.expectThrow(bonuses.process(0, { from: accounts[0] }));
			})
		})
	})

	describe('disapprove function', async () => {
		before(async () => {
	        contracts = await Utils.deployBonuses(artifacts, accounts);
	        bonuses = contracts.bonuses;
	        await bonuses.add(bonus2.address, bonus2.amount, { from: accounts[0] });
			await bonuses.lock({ from: accounts[0] });	        
		})

		it ('fails to disapprove as non-STOwner', async () => {
            await Utils.expectThrow(bonuses.disapprove({ from: accounts[0] }));
		})

		it ('disapproves as STOwner', async () => {
			var status = await bonuses.status.call();
			assert.equal(status.toNumber(), 1);

			var result = await bonuses.disapprove({ from: accounts[1] });

			status = await bonuses.status.call();
			assert.equal(status.toNumber(), 4);
		})
	})
})
