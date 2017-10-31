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

            await processableAllocations.addProcessableAllocation("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xcccccccccccccccccccccccccccccccccccccccc", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xdddddddddddddddddddddddddddddddddddddddd", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xffffffffffffffffffffffffffffffffffffffff", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0x1111111111111111111111111111111111111111", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0x2222222222222222222222222222222222222222", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0x3333333333333333333333333333333333333333", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0x4444444444444444444444444444444444444444", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0x5555555555555555555555555555555555555555", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0x6666666666666666666666666666666666666666", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0x7777777777777777777777777777777777777777", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xabbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xbccccccccccccccccccccccccccccccccccccccc", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xbddddddddddddddddddddddddddddddddddddddd", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xbeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xbfffffffffffffffffffffffffffffffffffffff", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xb111111111111111111111111111111111111111", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xb222222222222222222222222222222222222222", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xb333333333333333333333333333333333333333", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xb444444444444444444444444444444444444444", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xb555555555555555555555555555555555555555", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xb666666666666666666666666666666666666666", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xb777777777777777777777777777777777777777", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xacbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xbacccccccccccccccccccccccccccccccccccccc", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xbcdddddddddddddddddddddddddddddddddddddd", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xbceeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xbcffffffffffffffffffffffffffffffffffffff", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xbc11111111111111111111111111111111111111", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xbc22222222222222222222222222222222222222", 1, { from: accounts[0] })
            await processableAllocations.addProcessableAllocation("0xbc33333333333333333333333333333333333333", 1, { from: accounts[0] })
            await Utils.expectThrow(processableAllocations.addProcessableAllocation.call("0xbc44444444444444444444444444444444444444", 1, { from: accounts[1] }))
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
