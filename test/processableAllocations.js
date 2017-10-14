const Utils = require('./lib/utils.js')

// Add Processable Allocation
//     calls as non-owner
//     calls as owner and unlocked
//     calls as owner and locked
// Lock
//     calls as non-owner
//     calls as owner and unlocked with no allocations
//     calls as owner and unlocked
//     calls as owner and locked
// Process Processable Allocations
//     calls as non-owner
//     calls as owner and unlocked
//
//     With OK allocations
//         calls as owner and locked
//     With !OK allocations
//         calls as owner and locked


contract('ProcessableAllocations', function(accounts) {
    describe('addProcessableAllocation function', async () => {
        var trustee = null
        var processableAllocations = null

        before(async () => {
            contracts = await Utils.deployProcessableAllocations(artifacts, accounts)
            trustee = contracts.trustee
            processableAllocations = contracts.processableAllocations
        })

        it("calls as non-owner", async () => {
            await Utils.expectThrow(processableAllocations.addProcessableAllocation.call(accounts[0], 1, { from: accounts[1] }))
        })

        it("calls as owner and unlocked", async () => {
            assert.equal(await processableAllocations.addProcessableAllocation.call(accounts[0], 1, { from: accounts[0] }), true)

            const result = await processableAllocations.addProcessableAllocation(accounts[0], 1, { from: accounts[0] })

            Utils.checkProcessableAllocationAddedEventGroup(result, accounts[0], 1)
        })

        it("calls as owner and locked", async () => {
            await processableAllocations.lock({ from: accounts[0] })
            await Utils.expectThrow(processableAllocations.addProcessableAllocation.call(accounts[1], 1, { from: accounts[0] }))
        })
    })

    describe('lock function', async () => {
        var trustee = null
        var processableAllocations = null

        before(async () => {
            contracts = await Utils.deployProcessableAllocations(artifacts, accounts)
            trustee = contracts.trustee
            processableAllocations = contracts.processableAllocations
        })

        it("calls as non-owner", async () => {
            await Utils.expectThrow(processableAllocations.lock.call({ from: accounts[1] }))
        })

        it("calls as owner and unlocked with no allocations", async () => {
            await Utils.expectThrow(processableAllocations.lock.call({ from: accounts[0] }))
        })

        it("calls as owner and unlocked", async () => {
            await processableAllocations.addProcessableAllocation(accounts[0], 1, { from: accounts[0] })

            const result = await processableAllocations.lock({ from: accounts[0] })

            // ProcessableAllocations.lock initiates an ownership transfer Trustee.adminAddress
            // The ownership transfer must be completed by the new owner
            await processableAllocations.completeOwnershipTransfer({ from: accounts[1] })

            assert.equal(await processableAllocations.owner.call({ from: accounts[0] }), accounts[1])
            assert.equal(await processableAllocations.status.call({ from: accounts[0] }), 1)
            Utils.checkLockedEventGroup(result)
        })

        it("calls as owner and locked", async () => {
            await Utils.expectThrow(processableAllocations.lock.call({ from: accounts[1] }))
        })
    })

    describe('processProcessableAllocations function', async () => {
        var trustee = null
        var processableAllocations = null

        before(async () => {
            contracts = await Utils.deployProcessableAllocations(artifacts, accounts)
            trustee = contracts.trustee
            processableAllocations = contracts.processableAllocations
        })

        it("calls as non-owner", async () => {
            await Utils.expectThrow(processableAllocations.processProcessableAllocations.call({ from: accounts[1] }))
        })

        it("calls as owner and unlocked", async () => {
            await Utils.expectThrow(processableAllocations.processProcessableAllocations.call({ from: accounts[0] }))
        })

        context('with OK allocations', async () => {
            before(async () => {
                contracts = await Utils.deployProcessableAllocations(artifacts, accounts)
                trustee = contracts.trustee
                processableAllocations = contracts.processableAllocations

                await trustee.grantAllocation(accounts[0], 1, false, { from: accounts[1] })
                await trustee.grantAllocation(accounts[1], 1, false, { from: accounts[1] })
            })

            it("calls as owner and locked", async () => {
                await processableAllocations.addProcessableAllocation(accounts[0], 1, { from: accounts[0] })
                await processableAllocations.addProcessableAllocation(accounts[1], 1, { from: accounts[0] })
                await processableAllocations.lock({ from: accounts[0] })

                // ProcessableAllocations.lock initiates an ownership transfer Trustee.adminAddress
                // The ownership transfer must be completed by the new owner                
                await processableAllocations.completeOwnershipTransfer({ from: accounts[1] })
                await trustee.setOpsAddress(processableAllocations.address, { from: accounts[1] })

                assert.equal(await processableAllocations.processProcessableAllocations.call({ from: accounts[1] }), true)

                const result = await processableAllocations.processProcessableAllocations({ from: accounts[1] })

                assert.equal(result.logs.length, 2)

                // A ProcessableAllocationProcessed event is emitted for each allocation
                assert.equal(await processableAllocations.status.call({ from: accounts[0] }), 2)
                Utils.checkProcessableAllocationProcessedEvent(result.logs[0], accounts[0], 1, true)
                Utils.checkProcessableAllocationProcessedEvent(result.logs[1], accounts[1], 1, true)
            })
        })

        context('with !OK allocations', async () => {
            before(async () => {
                contracts = await Utils.deployProcessableAllocations(artifacts, accounts)
                trustee = contracts.trustee
                processableAllocations = contracts.processableAllocations

                await trustee.grantAllocation(accounts[0], 1, false, { from: accounts[1] })
                await trustee.grantAllocation(accounts[1], 1, false, { from: accounts[1] })
            })

            it("calls as owner and locked", async () => {
                await processableAllocations.addProcessableAllocation(accounts[0], 1, { from: accounts[0] })
                await processableAllocations.addProcessableAllocation(accounts[1], 2, { from: accounts[0] })
                await processableAllocations.lock({ from: accounts[0] })

                // ProcessableAllocations.lock initiates an ownership transfer to Trustee.adminAddress
                // The ownership transfer must be completed by the new owner                
                await processableAllocations.completeOwnershipTransfer({ from: accounts[1] })
                await trustee.setOpsAddress(processableAllocations.address, { from: accounts[1] })

                assert.equal(await processableAllocations.processProcessableAllocations.call({ from: accounts[1] }), false)

                const result = await processableAllocations.processProcessableAllocations({ from: accounts[1] })

                assert.equal(result.logs.length, 2)

                // A ProcessableAllocationProcessed event is emitted for each allocation
                assert.equal(await processableAllocations.status.call({ from: accounts[0] }), 3)
                Utils.checkProcessableAllocationProcessedEvent(result.logs[0], accounts[0], 1, true)
                Utils.checkProcessableAllocationProcessedEvent(result.logs[1], accounts[1], 2, false)
            })
        })
    })
})
