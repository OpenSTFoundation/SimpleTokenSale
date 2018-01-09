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

	var addressesPalette = _.range(1,9);

	for (var i = 0; i < addressesPalette.length; i++) {
		for(var t = 0; t < addressesPalette.length; t++) {
			for(var e = 0; e < addressesPalette.length; e++) {
				if (i == 0 && t == 0 && e == 0) continue;

				var address = "0x" + i + t;
				_.times(38, function() { address = address + e });
				addresses.push(address);
			}
		}
	}

	var addresses = addresses.slice(0,200);
	var amounts = _.range(0,200); // N.B.: 0 amount is not prohibited by Bonuses
	var totalBonuses = 0;

	for (var i = 0; i < amounts.length; i++) {
		totalBonuses += amounts[i];
	}

	describe('properties', async () => {
		before(async () => {
	        contracts = await Utils.deployBonuses(artifacts, accounts);
	        token = contracts.token;
	        bonuses = contracts.bonuses;
		})

		it ('has simpleToken', async () => {
			assert.equal(await bonuses.simpleToken.call(), token.address);
		})

		it ('has simpleToken owner', async () => {
			assert.equal(await bonuses.stOwner.call(), await token.owner.call());
		})
	})

	describe('add function', async () => {
		before(async () => {
	        contracts = await Utils.deployBonuses(artifacts, accounts);
	        bonuses = contracts.bonuses;
		})

		it ('fails to add as non-owner', async () => {
            await Utils.expectThrow(bonuses.add(addresses, amounts, { from: accounts[1] }));
		})

		it ('adds as owner', async () => {
			var totalAmounts = 0;
            var simResult = await bonuses.add.call(addresses, amounts, { from: accounts[0] });
            var result = await bonuses.add(addresses, amounts, { from: accounts[0] });
            var lastIndex = simResult.toNumber();

            for (var i = 0; i <= lastIndex; i++) {
            	totalAmounts = totalAmounts + amounts[i];
            }

			Utils.checkBonusesAddedEvent(result.logs[0], lastIndex);
            assert.equal(await bonuses.getProcessablesSize.call(), lastIndex + 1);
            assert.equal(await bonuses.remainingTotalBonuses.call(), totalAmounts);
		})
	})

	describe('approve function', async () => {
		before(async () => {
	        contracts = await Utils.deployBonuses(artifacts, accounts);
	        bonuses = contracts.bonuses;
	        await bonuses.add(addresses, amounts, { from: accounts[0] });
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
		        var total = 0;
		        var addressesSlice = addresses;
		        var amountsSlice = amounts;
		        var totalBonuses = 0;

				while (total < addresses.length) {
		            var simResult = await bonuses.add.call(addressesSlice, amountsSlice, { from: accounts[0] });
		            var result = await bonuses.add(addressesSlice, amountsSlice, { from: accounts[0] });
		            var from = simResult.toNumber() + 1;
		            total = total + from;

		            addressesSlice = addressesSlice.slice(from);
		            amountsSlice = amountsSlice.slice(from);
				}

				await bonuses.lock({ from: accounts[0] });
				await bonuses.approve({ from: accounts[1] });
			})

			it ('is setup to process bonuses', async () => {
				var size = await bonuses.getProcessablesSize.call();
				assert.equal(size.toNumber(), addresses.length);

				var remaining = await bonuses.remainingTotalBonuses.call();
				assert.equal(remaining.toNumber(), totalBonuses);

				var status = await bonuses.status.call();
				assert.equal(status.toNumber(), 2);			
			})

			it ('fails to process as non-owner', async () => {
	            await Utils.expectThrow(bonuses.process(0, { from: accounts[1] }));
			})

			it ('processes as owner when approved and allowed', async () => {
				var remaining = await bonuses.remainingTotalBonuses.call();
				await token.approve(bonuses.address, remaining.toNumber(), { from: accounts[1] });

				var simResult 			= null;
				var result 				= null;
				var from 				= 0;
				var to 					= 0;
				var balance 			= null;
				var totalTransferred 	= 0;
				var totalSupply 		= new BigNumber(web3.toWei(800000000, "ether"));

				while (to < (addresses.length - 1)) {
					simResult = await bonuses.process.call(from, { from: accounts[0] });
					result    = await bonuses.process(from, { from: accounts[0] });

					to = simResult.toNumber();

					for (var i = from; i <= to; i++) {
						totalTransferred += amounts[i];
						Utils.checkBonusProcessedEvent(result.logs[i - from], addresses[i].toLowerCase(), amounts[i]);
					}

					from = to + 1;

					// Confirm that the last processed bonus is marked processed
					lastBonus = await bonuses.processables.call(to);
					assert.equal(lastBonus[2], true);

					// Confirm that the next bonus to process is marked !processed
					if (from < addresses.length) {
						nextBonus = await bonuses.processables.call(from);
						assert.equal(nextBonus[2], false);
					}

					// Confirm that remainingTotalBonuses is correctly decreased
					remaining = await bonuses.remainingTotalBonuses.call();
					assert.equal(remaining.toNumber(), totalBonuses - totalTransferred);

					// Confirm that SimpleToken.owner balance is correctly decreased
					balance = await token.balanceOf.call(accounts[1]);
					assert.equal(balance.toNumber(), totalSupply.sub(totalTransferred).toNumber());
				}

				assert.equal(_.last(result.logs).event, "Completed");

				var status = await bonuses.status.call();
				assert.equal(status.toNumber(), 3);			

				// Confirm that remainingTotalBonuses is 0
				remaining = await bonuses.remainingTotalBonuses.call();
				assert.equal(remaining.toNumber(), 0);
			})

			it ('fails to process as owner when completed', async () => {
	            await Utils.expectThrow(bonuses.process(0, { from: accounts[0] }));
			})
		})

		context('with disapproval', async () => {
			before(async () => {
		        contracts = await Utils.deployBonuses(artifacts, accounts);
		        bonuses = contracts.bonuses;
		        await bonuses.add(addresses, amounts, { from: accounts[0] });
				await bonuses.lock({ from: accounts[0] });
				await token.approve(bonuses.address, totalBonuses, { from: accounts[1] });
				await bonuses.approve({ from: accounts[1] });
				await bonuses.disapprove({ from: accounts[1] });
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
	        await bonuses.add(addresses, amounts, { from: accounts[0] });
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
