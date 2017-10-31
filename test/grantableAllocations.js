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

            await grantableAllocations.addGrantableAllocation("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xcccccccccccccccccccccccccccccccccccccccc", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xdddddddddddddddddddddddddddddddddddddddd", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xffffffffffffffffffffffffffffffffffffffff", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0x1111111111111111111111111111111111111111", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0x2222222222222222222222222222222222222222", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0x3333333333333333333333333333333333333333", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0x4444444444444444444444444444444444444444", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0x5555555555555555555555555555555555555555", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0x6666666666666666666666666666666666666666", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0x7777777777777777777777777777777777777777", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xabbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xbccccccccccccccccccccccccccccccccccccccc", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xbddddddddddddddddddddddddddddddddddddddd", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xbeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xbfffffffffffffffffffffffffffffffffffffff", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xb111111111111111111111111111111111111111", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xb222222222222222222222222222222222222222", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xb333333333333333333333333333333333333333", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xb444444444444444444444444444444444444444", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xb555555555555555555555555555555555555555", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xb666666666666666666666666666666666666666", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xb777777777777777777777777777777777777777", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xacbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xbacccccccccccccccccccccccccccccccccccccc", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xbcdddddddddddddddddddddddddddddddddddddd", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xbceeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xbcffffffffffffffffffffffffffffffffffffff", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xbc11111111111111111111111111111111111111", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xbc22222222222222222222222222222222222222", 1, false, { from: accounts[0] })
            await grantableAllocations.addGrantableAllocation("0xbc33333333333333333333333333333333333333", 1, false, { from: accounts[0] })
            await Utils.expectThrow(grantableAllocations.addGrantableAllocation.call("0xbc44444444444444444444444444444444444444", 1, false, { from: accounts[1] }))
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
