const Utils = require('./lib/utils.js')

var Moment = require('moment')

// Extend unlock date
//    calls extendUnlockDate as owner with early date
//    calls extendUnlockDate as owner with later date
//    calls extendUnlockDate as non-owner
// Transfer before unlock date
//    calls transfer as owner
//    calls transfer as non-owner
// Transfer after unlock date
//    calls transfer as owner
//    calls transfer as non-owner

contract('FutureTokenSaleLockBox', function(accounts) {
    const END_TIME   = 1512133199; // 2017-12-01, 12:59:59 UTC
    const SIX_MONTHS = 60 * 60 * 24 * 7 * 26

    describe('extendUnlockDate function', async () => {
        var contracts = null
        var lockBox   = null

        before(async () => {
            contracts = await Utils.deployLockBox(artifacts, accounts)
            lockBox   = contracts.lockBox
        })

        it("calls extendUnlockDate as owner with early date", async () => {
            await Utils.expectThrow(lockBox.extendUnlockDate.call((END_TIME + SIX_MONTHS) - 1, { from: accounts[0]}))
        })

        it("calls extendUnlockDate as owner with later date", async () => {
            const unlockDateBefore = await lockBox.unlockDate();

            assert.equal(await lockBox.extendUnlockDate.call((END_TIME + SIX_MONTHS) + 1, { from: accounts[0]}), true)

            const result = await lockBox.extendUnlockDate((END_TIME + SIX_MONTHS) + 1, { from: accounts[0]})
            const unlockDateAfter = await lockBox.unlockDate();

            assert.equal(unlockDateAfter.sub(unlockDateBefore).toNumber(), 1)
            Utils.checkUnlockDateExtendedEventGroup(result, (END_TIME + SIX_MONTHS) + 1)
        })

        it("calls extendUnlockDate as non-owner", async () => {
            await Utils.expectThrow(lockBox.extendUnlockDate.call((END_TIME + SIX_MONTHS) + 1, { from: accounts[1]}))
        })
    })

    describe('transfer function', async () => {
        var contracts = null
        var token     = null
        var lockBox   = null

        before(async () => {
            contracts = await Utils.deployLockBox(artifacts, accounts)
            token     = contracts.token
            lockBox   = contracts.lockBox
        })

        context('before unlock date', async () => {
            it("calls transfer as owner", async () => {
                await Utils.expectThrow(lockBox.transfer.call(accounts[0], 1, { from: accounts[0]}))
            })

            it("calls transfer as non-owner", async () => {
                await Utils.expectThrow(lockBox.transfer.call(accounts[0], 1, { from: accounts[1]}))
            })
        })

        context('after unlock date', async () => {
            before(async() => {
                await Utils.changeTimeLockBox(lockBox, (END_TIME + SIX_MONTHS) + 1)
            })

            it("calls transfer as owner", async () => {
                const tokenBalanceOwnerBefore = await token.balanceOf(accounts[0])
                const tokenBalanceLockBoxBefore = await token.balanceOf(lockBox.address)

                assert.equal(await lockBox.transfer.call(accounts[0], 1, { from: accounts[0]}), true)

                const result = await lockBox.transfer(accounts[0], 1, { from: accounts[0]})
                const tokenBalanceOwnerAfter = await token.balanceOf(accounts[0])
                const tokenBalanceLockBoxAfter = await token.balanceOf(lockBox.address)

                assert.equal(tokenBalanceOwnerAfter.sub(tokenBalanceOwnerBefore).toNumber(), 1)
                assert.equal(tokenBalanceLockBoxAfter.sub(tokenBalanceLockBoxBefore).toNumber(), -1)
                Utils.checkTokensTransferredEventGroup(result, accounts[0], 1)
            })

            it("calls transfer as non-owner", async () => {
                await Utils.expectThrow(lockBox.transfer.call(accounts[0], 1, { from: accounts[1]}))
            })
        })
    })
})
