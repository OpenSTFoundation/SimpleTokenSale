const Utils = require('./lib/utils.js')

// AddInternal
// 		adds some addresses
// 		fails to add when locked
// Lock
// 		fails to lock as non-owner
// 		fails to lock as owner when unlocked with 0 addresses
// 		locks as owner when unlocked with 1 address
// 		fails to lock as owner when locked
// ApproveInternal
// 		fails to approve when unlocked
// 		approves when locked
// 		fails to approve when approved
// CompleteInternal
// 		fails to complete when locked
// 		completes when approved
// 		fails to complete when completed
// DisapproveInternal
//		fails to disapprove when unlocked
//		disapproves when locked
//		fails to disapprove when disapproved
//		when approved
// 			disapproves when approved
//		when completed
// 			fails to disapprove when completed

contract('Processables', function(accounts) {
	var processables = null;

    describe('addInternal function', async () => {
		before(async () => {
	        contracts = await Utils.deployProcessables(artifacts, accounts);
	        processables = contracts.processables;
		})

    	it ('adds some addresses', async () => {
    		var addresses = [];

    		// Add accounts[0], from accounts[0]
    		addresses.push(accounts[0])
            assert.equal(await processables.add.call(accounts[0], { from: accounts[0] }), true);
            await processables.add(accounts[0], { from: accounts[0] });
            var resultAddresses = await processables.getAddresses();
            assert.equal(resultAddresses.toString(), addresses.toString());
            var size = await processables.getAddressesSize();
            assert.equal(size.toNumber(), 1);

    		// Add accounts[0] again, from accounts[1]
    		addresses.push(accounts[0])
            assert.equal(await processables.add.call(accounts[0], { from: accounts[1] }), true);
            await processables.add(accounts[0], { from: accounts[0] });
            resultAddresses = await processables.getAddresses();
            assert.equal(resultAddresses.toString(), addresses.toString());
            size = await processables.getAddressesSize();
            assert.equal(size.toNumber(), 2);
    	})

    	it ('fails to add when locked', async () => {
    		await processables.lock({ from: accounts[0] });
            await Utils.expectThrow(processables.add(accounts[2], { from: accounts[0] }));
		})
    })

    describe('lock function', async () => {
		before(async () => {
	        contracts = await Utils.deployProcessables(artifacts, accounts);
	        processables = contracts.processables;
		})

		it ('fails to lock as non-owner', async () => {
            await Utils.expectThrow(processables.lock({ from: accounts[1] }));
		})

		it ('fails to lock as owner when unlocked with 0 addresses', async () => {
            await Utils.expectThrow(processables.lock({ from: accounts[0] }));
		})

		it ('locks as owner when unlocked with 1 address', async () => {
			var status = await processables.status.call();
			assert.equal(status.toNumber(), 0);
			
            await processables.add(accounts[0], { from: accounts[0] });
            const result = await processables.lock({ from: accounts[0] });

			status = await processables.status.call();
			assert.equal(status.toNumber(), 1);
            Utils.checkLockedEvent(result);
		})

		it ('fails to lock as owner when locked', async () => {
            await Utils.expectThrow(processables.lock({ from: accounts[0] }));
		})
    })

    describe('approveInternal function', async () => {
		before(async () => {
	        contracts = await Utils.deployProcessables(artifacts, accounts);
	        processables = contracts.processables;
            await processables.add(accounts[0], { from: accounts[0] });
		})

		it ('fails to approve when unlocked', async () => {
            await Utils.expectThrow(processables.approve({ from: accounts[0] }));
		})

		it ('approves when locked', async () => {
            await processables.lock({ from: accounts[0] });
			var status = await processables.status.call();
			assert.equal(status.toNumber(), 1);

            const result = await processables.approve({ from: accounts[0] });

			status = await processables.status.call();
			assert.equal(status.toNumber(), 2);
            Utils.checkApprovedEvent(result);
		})

		it ('fails to approve when approved', async () => {
            await Utils.expectThrow(processables.approve({ from: accounts[0] }));
		})
    })

    describe('completeInternal function', async () => {
		before(async () => {
	        contracts = await Utils.deployProcessables(artifacts, accounts);
	        processables = contracts.processables;
            await processables.add(accounts[0], { from: accounts[0] });
            await processables.lock({ from: accounts[0] });
		})

		it ('fails to complete when locked', async () => {
            await Utils.expectThrow(processables.complete({ from: accounts[0] }));
		})

		it ('completes when approved', async () => {
			await processables.approve({ from: accounts[0] });
			var status = await processables.status.call();
			assert.equal(status.toNumber(), 2);

            const result = await processables.complete({ from: accounts[0] });

			status = await processables.status.call();
			assert.equal(status.toNumber(), 3);
            Utils.checkCompletedEvent(result);
		})

		it ('fails to complete when completed', async () => {
            await Utils.expectThrow(processables.complete({ from: accounts[0] }));
		})
    })

    describe('disapproveInternal function', async () => {
		before(async () => {
	        contracts = await Utils.deployProcessables(artifacts, accounts);
	        processables = contracts.processables;
            await processables.add(accounts[0], { from: accounts[0] });
		})

		it ('fails to disapprove when unlocked', async () => {
            await Utils.expectThrow(processables.disapprove({ from: accounts[0] }));
		})

		it ('disapproves when locked and incomplete', async () => {
			await processables.lock({ from: accounts[0] });
			var status = await processables.status.call();
			assert.equal(status.toNumber(), 1);

            const result = await processables.disapprove({ from: accounts[0] });

			status = await processables.status.call();
			assert.equal(status.toNumber(), 4);
            Utils.checkDisapprovedEvent(result);
		})

		it ('fails to disapprove when disapproved', async () => {
            await Utils.expectThrow(processables.disapprove({ from: accounts[0] }));
		})

    	context('when approved', async () => {
			before(async () => {
		        contracts = await Utils.deployProcessables(artifacts, accounts);
		        processables = contracts.processables;
	            await processables.add(accounts[0], { from: accounts[0] });
				await processables.lock({ from: accounts[0] });
				await processables.approve({ from: accounts[0] });
			})

			it ('disapproves', async () => {
				var status = await processables.status.call();
				assert.equal(status.toNumber(), 2);

	            const result = await processables.disapprove({ from: accounts[0] });

				status = await processables.status.call();
				assert.equal(status.toNumber(), 4);
	            Utils.checkDisapprovedEvent(result);
			})
    	})

    	context('when completed', async () => {
			before(async () => {
		        contracts = await Utils.deployProcessables(artifacts, accounts);
		        processables = contracts.processables;
	            await processables.add(accounts[0], { from: accounts[0] });
				await processables.lock({ from: accounts[0] });
				await processables.approve({ from: accounts[0] });
				await processables.complete({ from: accounts[0] });
			})

			it ('fails to disapprove', async () => {
	            await Utils.expectThrow(processables.disapprove({ from: accounts[0] }));
			})
    	})
    })
})
