const Utils = require('./lib/utils.js')

// Add Grantable Allocation
//     calls as non-owner
//     calls as owner and unlocked
//     calls as owner and locked
// Lock
//     calls as non-owner
//     calls as owner and unlocked with no allocations
//     calls as owner and unlocked
//     calls as owner and locked
// Grant Grantable Allocations
//     calls as non-owner
//     calls as owner and unlocked
//     calls as owner and locked


contract('GrantableAllocations', function(accounts) {
    describe('addGrantableAllocation function', async () => {
        var trustee = null
        var grantableAllocations = null

        before(async () => {
            contracts = await Utils.deployGrantableAllocations(artifacts, accounts)
            trustee = contracts.trustee
            grantableAllocations = contracts.grantableAllocations
        })

        it("calls as non-owner", async () => {
            await Utils.expectThrow(grantableAllocations.addGrantableAllocation.call(accounts[0], 1, false, { from: accounts[1] }))
        })

        it("calls as owner and unlocked", async () => {
            assert.equal(await grantableAllocations.addGrantableAllocation.call(accounts[0], 1, false, { from: accounts[0] }), true)

            const result = await grantableAllocations.addGrantableAllocation(accounts[0], 1, false, { from: accounts[0] })

            Utils.checkGrantableAllocationAddedEventGroup(result, accounts[0], 1, false)
        })

        it("calls as owner and locked", async () => {
            await grantableAllocations.lock({ from: accounts[0] })
            await Utils.expectThrow(grantableAllocations.addGrantableAllocation.call(accounts[1], 1, false, { from: accounts[0] }))
        })
    })

    describe('lock function', async () => {
        var trustee = null
        var grantableAllocations = null

        before(async () => {
            contracts = await Utils.deployGrantableAllocations(artifacts, accounts)
            trustee = contracts.trustee
            grantableAllocations = contracts.grantableAllocations
        })

        it("calls as non-owner", async () => {
            await Utils.expectThrow(grantableAllocations.lock.call({ from: accounts[1] }))
        })

        it("calls as owner and unlocked with no allocations", async () => {
            await Utils.expectThrow(grantableAllocations.lock.call({ from: accounts[0] }))
        })

        it("calls as owner and unlocked", async () => {
            await grantableAllocations.addGrantableAllocation(accounts[0], 1, false, { from: accounts[0] })

            const result = await grantableAllocations.lock({ from: accounts[0] })

            // GrantableAllocations.lock initiates an ownership transfer Trustee.adminAddress
            // The ownership transfer must be completed by the new owner
            await grantableAllocations.completeOwnershipTransfer({ from: accounts[1] })

            assert.equal(await grantableAllocations.owner.call({ from: accounts[0] }), accounts[1])
            assert.equal(await grantableAllocations.status.call({ from: accounts[0] }), 1)
            Utils.checkLockedEventGroup(result)
        })

        it("calls as owner and locked", async () => {
            await Utils.expectThrow(grantableAllocations.lock.call({ from: accounts[1] }))
        })
    })

    describe('grantGrantableAllocations function', async () => {
        var trustee = null
        var grantableAllocations = null

        before(async () => {
            contracts = await Utils.deployGrantableAllocations(artifacts, accounts)
            trustee = contracts.trustee
            grantableAllocations = contracts.grantableAllocations
        })

        it("calls as non-owner", async () => {
            await Utils.expectThrow(grantableAllocations.grantGrantableAllocations.call({ from: accounts[1] }))
        })

        it("calls as owner and unlocked", async () => {
            await Utils.expectThrow(grantableAllocations.grantGrantableAllocations.call({ from: accounts[0] }))
        })

        it("calls as owner and locked", async () => {
            await grantableAllocations.addGrantableAllocation(accounts[0], 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation(accounts[1], 1, false, { from: accounts[0] })
            await grantableAllocations.lock({ from: accounts[0] })

            // GrantableAllocations.lock initiates an ownership transfer Trustee.adminAddress
            // The ownership transfer must be completed by the new owner                
            await grantableAllocations.completeOwnershipTransfer({ from: accounts[1] })
            await trustee.setAdminAddress(grantableAllocations.address, { from: accounts[1] })

            assert.equal(await grantableAllocations.grantGrantableAllocations.call({ from: accounts[1] }), true)

            const result = await grantableAllocations.grantGrantableAllocations({ from: accounts[1] })

            assert.equal(result.logs.length, 2)

            // A GrantableAllocationGranted event is emitted for each allocation
            assert.equal(await grantableAllocations.status.call({ from: accounts[0] }), 2)
            Utils.checkGrantableAllocationGrantedEvent(result.logs[0], accounts[0], 1, false)
            Utils.checkGrantableAllocationGrantedEvent(result.logs[1], accounts[1], 1, false)

            // GrantableAllocations.grantGrantableAllocations resets Trustee.admin to the address there
            // before GrantableAllocations was locked
            assert.equal(await trustee.adminAddress.call({ from: accounts[0] }), accounts[1])            
        })
    })
})
