const Utils = require('./lib/utils.js')

// Add Presale
//     calls as non-owner
//     calls as owner and unlocked
//     calls as owner and locked
// Lock
//     calls as non-owner
//     calls as owner and unlocked with no presales
//     calls as owner and unlocked
//     calls as owner and locked
// Add Presales
//     calls as non-owner
//     calls as owner and unlocked
//     calls as owner and locked


contract('Presales', function(accounts) {
    describe('addPresale function', async () => {
        var presales = null

        before(async () => {
            contracts = await Utils.deployPresales(artifacts, accounts)
            presales = contracts.presales
        })

        it("calls as non-owner", async () => {
            await Utils.expectThrow(presales.addPresale.call(accounts[0], 3, 2, { from: accounts[1] }))
        })

        it("calls as owner and unlocked", async () => {
            assert.equal(await presales.addPresale.call(accounts[0], 3, 2, { from: accounts[0] }), true)

            const result = await presales.addPresale(accounts[0], 3, 2, { from: accounts[0] })

            Utils.checkPresaleAddedToPresalesEvent(result.logs[0], accounts[0], 3, 2)

            await presales.addPresale("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xcccccccccccccccccccccccccccccccccccccccc", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xdddddddddddddddddddddddddddddddddddddddd", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xffffffffffffffffffffffffffffffffffffffff", 3, 2, { from: accounts[0] })
            await presales.addPresale("0x1111111111111111111111111111111111111111", 3, 2, { from: accounts[0] })
            await presales.addPresale("0x2222222222222222222222222222222222222222", 3, 2, { from: accounts[0] })
            await presales.addPresale("0x3333333333333333333333333333333333333333", 3, 2, { from: accounts[0] })
            await presales.addPresale("0x4444444444444444444444444444444444444444", 3, 2, { from: accounts[0] })
            await presales.addPresale("0x5555555555555555555555555555555555555555", 3, 2, { from: accounts[0] })
            await presales.addPresale("0x6666666666666666666666666666666666666666", 3, 2, { from: accounts[0] })
            await presales.addPresale("0x7777777777777777777777777777777777777777", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xabbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xbccccccccccccccccccccccccccccccccccccccc", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xbddddddddddddddddddddddddddddddddddddddd", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xbeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xbfffffffffffffffffffffffffffffffffffffff", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xb111111111111111111111111111111111111111", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xb222222222222222222222222222222222222222", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xb333333333333333333333333333333333333333", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xb444444444444444444444444444444444444444", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xb555555555555555555555555555555555555555", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xb666666666666666666666666666666666666666", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xb777777777777777777777777777777777777777", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xacbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xbacccccccccccccccccccccccccccccccccccccc", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xbcdddddddddddddddddddddddddddddddddddddd", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xbceeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xbcffffffffffffffffffffffffffffffffffffff", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xbc11111111111111111111111111111111111111", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xbc22222222222222222222222222222222222222", 3, 2, { from: accounts[0] })
            await presales.addPresale("0xbc33333333333333333333333333333333333333", 3, 2, { from: accounts[0] })
            await Utils.expectThrow(presales.addPresale.call("0xbc44444444444444444444444444444444444444", 3, 2, { from: accounts[1] }))
        })

        it("calls as owner and locked", async () => {
            await presales.lock({ from: accounts[0] })
            await Utils.expectThrow(presales.addPresale.call(accounts[1], 3, 2, { from: accounts[0] }))
        })
    })

    describe('lock function', async () => {
        var presales = null

        before(async () => {
            contracts = await Utils.deployPresales(artifacts, accounts)
            presales = contracts.presales
        })

        it("calls as non-owner", async () => {
            await Utils.expectThrow(presales.lock.call({ from: accounts[1] }))
        })

        it("calls as owner and unlocked with no presales", async () => {
            await Utils.expectThrow(presales.lock.call({ from: accounts[0] }))
        })

        it("calls as owner and unlocked", async () => {
            await presales.addPresale(accounts[0], 3, 2, { from: accounts[0] })

            const result = await presales.lock({ from: accounts[0] })

            // Presales.lock initiates an ownership transfer TokenSale.adminAddress
            // The ownership transfer must be completed by the new owner
            await presales.completeOwnershipTransfer({ from: accounts[1] })

            assert.equal(await presales.owner.call({ from: accounts[0] }), accounts[1])
            assert.equal(await presales.status.call({ from: accounts[0] }), 1)
            Utils.checkLockedEventGroup(result)
        })

        it("calls as owner and locked", async () => {
            await Utils.expectThrow(presales.lock.call({ from: accounts[1] }))
        })
    })

    describe('process function', async () => {
        var presales = null

        before(async () => {
            contracts = await Utils.deployPresales(artifacts, accounts)
            tokenSale = contracts.tokenSale
            presales  = contracts.presales
        })

        it("calls as non-owner", async () => {
            await Utils.expectThrow(presales.process.call({ from: accounts[1] }))
        })

        it("calls as owner and unlocked", async () => {
            await Utils.expectThrow(presales.process.call({ from: accounts[0] }))
        })

        it("calls as owner and locked", async () => {
            await presales.addPresale(accounts[0], 3, 2, { from: accounts[0] })
            await presales.addPresale(accounts[1], 3, 2, { from: accounts[0] })
            await presales.lock({ from: accounts[0] })
            // TokenSale.addPresale can only be called by TokenSale.adminAddress
            await tokenSale.setAdminAddress(presales.address, { from: accounts[1] })

            // Presales.lock initiates an ownership transfer to TokenSale.adminAddress
            // The ownership transfer must be completed by the new owner                
            await presales.completeOwnershipTransfer({ from: accounts[1] })

            assert.equal(await presales.process.call({ from: accounts[1] }), true)

            const result = await presales.process({ from: accounts[1] })

            assert.equal(result.logs.length, 4)

            assert.equal(await presales.status.call({ from: accounts[0] }), 2)
            Utils.checkPresaleAddedToPresalesEvent(result.logs[0], accounts[0], 3, 2)
            Utils.checkPresaleAddedToTokenSaleEvent(result.logs[1], accounts[0], 3, 2)
            Utils.checkPresaleAddedToPresalesEvent(result.logs[2], accounts[1], 3, 2)
            Utils.checkPresaleAddedToTokenSaleEvent(result.logs[3], accounts[1], 3, 2)

            // Presales.process resets TokenSale.admin to the address there
            // before Presales was locked
            assert.equal(await tokenSale.adminAddress.call({ from: accounts[0] }), accounts[1])
        })
    })
})
