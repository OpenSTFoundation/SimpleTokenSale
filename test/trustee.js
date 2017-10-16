const Utils = require('./lib/utils.js')

const Moment = require('moment')
const BigNumber = require('bignumber.js')

const SimpleToken = artifacts.require("./SimpleToken.sol")
const Trustee = artifacts.require("./Trustee.sol")


//
// Trustee
//    - basic properties (totalLocked, allocations)
//    - grantAllocation
//       - grant 0 value (fails)
//       - grant 100 value to 0 address (fails)
//       - grant 10000 value when trustee only has 1000 (fails)
//       - grant 100 value when trustee has 10000, non-owner (fails)
//       - grant 100 value when trustee has 10000 (ok)
//       - grant 900 value to same address (fails)
//       - grant 900 value to another address (ok)
//       - grant    1 value (fails)
//       - grant 100 value after existing 100 allocation revoked (ok)
//       - grant    1 value (fails)
//       - grant 100 value that went to 0 through processing (fails)
//    - revokeAllocation
//       - revoke before token finalized
//       - revoke non-existent allocation (fails)
//       - revoke allocation that can be revoked (ok)
//       - revoke allocation that cannot be revoked (fails)
//       - revoke allocation non-owner (fails)
//       - replace non-locked with locked allocation (ok)
//       - revoke the newly replaced locked allocation (fails)
//    - processAllocation
//       - process before token finalized
//       - process non-existing allocation (fails)
//       - process allocation for 0 value (fails)
//       - process allocation that has 0 value left (fails)
//       - process allocation > value left (fails)
//       - process allocation as non-owner (fails)
//       - process allocation for half its value (ok)
//       - process allocation for all its value (ok)
//    - reclaimTokens
//       - before finalized
//       - after finalized
//       - with all tokens already locked
//    - Ownership and permissions
//       - grantAllocation
//          - as owner
//          - as admin
//          - as ops, not finalized
//          - as ops, finalized
//          - as revoke
//          - as normal
//       - revokeAllocation
//          - as owner
//          - as admin
//          - as ops
//          - as normal
//       - processAllocation
//          - as owner
//          - as admin
//          - as ops, not finalized
//          - as ops, finalized
//          - as revoke
//          - as normal
//       - reclaimTokens
//          - as owner
//          - as admin
//          - as ops, finalized
//          - as revoke
//          - as normal
//
contract('Trustee', (accounts) => {

   const DECIMALSFACTOR = new BigNumber('10').pow('18')

   const TOKENS_MAX     = new BigNumber('800000000').mul(DECIMALSFACTOR)

   const owner  = accounts[0]
   const admin  = accounts[1]
   const ops    = accounts[2]
   const revoke = accounts[3]


   describe('Basic properties', async () => {

      var token = null
      var trustee = null

      before(async () => {
         var contracts = await Utils.deployTrustee(artifacts, accounts)

         token = contracts.token
         trustee = contracts.trustee

         await token.transfer(trustee.address, new BigNumber("1000"))
      })


      it("totalLocked", async () => {
         assert.equal(await trustee.totalLocked.call(), 0)
      })

      it("allocations are public", async () => {
         var result = await trustee.allocations.call(accounts[0])
         assert.equal(result[0].toNumber(), 0) // amount
         assert.equal(result[1].toNumber(), 0) // transferred
         assert.equal(result[2], false)        // revokable
      })
   })


   describe('grantAllocation function', async () => {

      var token = null
      var trustee = null


      before(async () => {
         var contracts = await Utils.deployTrustee(artifacts, accounts)

         token = contracts.token
         trustee = contracts.trustee

         await token.transfer(trustee.address, new BigNumber("1000"))

         await token.setAdminAddress(admin)
         await trustee.setAdminAddress(admin)
         await trustee.setOpsAddress(ops)
         await trustee.setRevokeAddress(revoke)

         await token.finalize({ from: accounts[1] })
      })

      it("grant 0 value", async () => {
         await Utils.expectThrow(trustee.grantAllocation(accounts[1], 0, true, { from: admin }))
      })

      it("grant 100 value to 0 address", async () => {
         await Utils.expectThrow(trustee.grantAllocation(0, 100, true, { from: admin }))
      })

      it("grant 10000 value when trustee only has 1000", async () => {
         await Utils.expectThrow(trustee.grantAllocation(accounts[1], 100000, true, { from: admin }))
      })

      it("grant 100 value when non-owner", async () => {
         await Utils.expectThrow(trustee.grantAllocation(accounts[1], 100, true, { from: accounts[4] }))
      })

      it("grant 100 value when admin", async () => {
         await trustee.grantAllocation(accounts[1], 100, true, { from: admin })
         const allocation = await trustee.allocations.call(accounts[1], { from: admin })

         assert.equal(allocation[0].toNumber(), 100)
         assert.equal(allocation[1].toNumber(), 0)
         assert.equal(allocation[2], true)
      })

      it("grant 900 value to same address", async () => {
         await Utils.expectThrow(trustee.grantAllocation(accounts[1], 900, true, { from: admin }))
      })

      it("grant 900 value to another address", async () => {
         await trustee.grantAllocation(accounts[2], 900, true, { from: admin })
      })

      it("grant 1 value to exceeding trustee pool", async () => {
         await Utils.expectThrow(trustee.grantAllocation(accounts[3], 900, true, { from: admin }))
      })

      it("grant 100 value after existing allocation revoked", async () => {
         assert.equal(await trustee.revokeAllocation.call(accounts[1], { from: revoke }), true)
         await trustee.revokeAllocation(accounts[1], { from: revoke })

         await trustee.grantAllocation(accounts[1], 100, true, { from: admin })
      })

      it("grant 1 value to exceeding trustee pool", async () => {
         await Utils.expectThrow(trustee.grantAllocation(accounts[3], 900, true, { from: admin }))
      })

      it("grant 100 value to address where grant went to 0", async () => {
         await trustee.processAllocation(accounts[1], 100, { from: ops })

         await token.transfer(trustee.address, 100)

         // This should fail since when an allocation goes to 0 it doesnt get deleted
         await Utils.expectThrow(trustee.grantAllocation(accounts[1], 100, true, { from: admin }))
      })
   })


   describe('revokeAllocation function', async () => {

      var token = null
      var trustee = null

      before(async () => {
         var contracts = await Utils.deployTrustee(artifacts, accounts)

         token = contracts.token
         trustee = contracts.trustee

         await token.setAdminAddress(admin)
         await trustee.setAdminAddress(admin)
         await trustee.setOpsAddress(ops)
         await trustee.setRevokeAddress(revoke)

         await token.transfer(trustee.address, new BigNumber("1000"))
      })


      it("revoke before token finalized", async () => {
         await trustee.grantAllocation(accounts[1], 10, true, { from: admin })
         await trustee.revokeAllocation(accounts[1], { from: revoke })
         await token.finalize({ from: admin })
      })

      it("revoke non-existent allocation", async () => {
         await Utils.expectThrow(trustee.revokeAllocation(accounts[2]), { from: revoke })
      })

      it("revoke allocation that can be revoked", async () => {
         await trustee.grantAllocation(accounts[1], 10, true, { from: admin })
         await trustee.revokeAllocation(accounts[1], { from: revoke })
      })

      it("revoke allocation that CANNOT be revoked", async () => {
         await trustee.grantAllocation(accounts[2], 10, false, { from: admin })
         await Utils.expectThrow(trustee.revokeAllocation(accounts[2], { from: ops }))
      })

      it("revoke allocation non-owner", async () => {
         await Utils.expectThrow(trustee.grantAllocation(accounts[1], 10, true, { from: accounts[4] }))
      })

      it("replace non-locked with locked allocation", async () => {
         await trustee.grantAllocation(accounts[1], 10, true, { from: admin })
         await trustee.revokeAllocation(accounts[1], { from: revoke })
         await trustee.grantAllocation(accounts[1], 10, false, { from: admin })
      })

      it("revoke newly locked allocation", async () => {
         await Utils.expectThrow(trustee.revokeAllocation(accounts[1], { from: revoke }))
      })

   })


   describe('processAllocation function', async () => {

      var token = null
      var trustee = null

      before(async () => {
         var contracts = await Utils.deployTrustee(artifacts, accounts)

         token = contracts.token
         trustee = contracts.trustee

         await token.setAdminAddress(admin)
         await trustee.setAdminAddress(admin)
         await trustee.setOpsAddress(ops)
         await trustee.setRevokeAddress(revoke)

         await token.transfer(trustee.address, new BigNumber("1000"))
      })


      it("process before token finalized", async () => {
         await trustee.grantAllocation(accounts[1], 10, true, { from: admin })
         await Utils.expectThrow(trustee.processAllocation(accounts[1], 10, { from: ops }))
         await token.finalize({ from: admin })
         await trustee.processAllocation(accounts[1], 10, { from: ops })
      })

      it("process non-existent allocation", async () => {
         await Utils.expectThrow(trustee.processAllocation(accounts[2], 10, { from: ops }))
      })

      it("process allocation that has 0 value left", async () => {
         await Utils.expectThrow(trustee.grantAllocation(accounts[1], 10, true, { from: admin }))
      })

      it("process allocation for 0 value", async () => {
         await trustee.grantAllocation(accounts[2], 10, true, { from: admin })
         await Utils.expectThrow(trustee.processAllocation(accounts[2], 0, { from: ops }))
      })

      it("process allocation for > value left", async () => {
         assert.equal(await trustee.processAllocation.call(accounts[2], 20, { from: ops }), false)
         await trustee.processAllocation.call(accounts[2], 20, { from: ops })
      })

      it("process allocation as non-owner", async () => {
         await Utils.expectThrow(trustee.processAllocation(accounts[2], 10, { from: accounts[4] }))
      })

      it("process allocation for half its value", async () => {
         await trustee.processAllocation(accounts[2], 5, { from: ops })
      })

      it("process allocation for all its value", async () => {
         await trustee.processAllocation(accounts[2], 5, { from: ops })
      })
   })


   describe('reclaimTokens function', async () => {

      var token = null
      var trustee = null

      before(async () => {
         var contracts = await Utils.deployTrustee(artifacts, accounts)

         token = contracts.token
         trustee = contracts.trustee

         await token.setAdminAddress(admin)
         await trustee.setAdminAddress(admin)
         await trustee.setOpsAddress(ops)
         await trustee.setRevokeAddress(revoke)

         await token.transfer(trustee.address, new BigNumber("1000"))
      })


      it("with all tokens already locked", async () => {
         await trustee.grantAllocation(accounts[1], 1000, true, { from: ops })

         await Utils.expectThrow(trustee.reclaimTokens.call(), { from: admin })

         await trustee.revokeAllocation(accounts[1], { from: revoke })
      })

      it("with half tokens locked", async () => {
         await trustee.grantAllocation(accounts[1], 500, true, { from: ops })

         const balance0Before = await token.balanceOf(accounts[0])
         const balanceTrusteeBefore = await token.balanceOf(trustee.address)

         assert.equal(await trustee.reclaimTokens.call({ from: admin }), true)
         Utils.checkTokensReclaimedEventGroup(await trustee.reclaimTokens({ from: admin }), 500)

         const balance0After = await token.balanceOf(accounts[0])
         const balanceTrusteeAfter = await token.balanceOf(trustee.address)

         assert.equal(balance0After.sub(balance0Before).toNumber(), 500)
         assert.equal(balanceTrusteeAfter.toNumber(), 500)

         await trustee.revokeAllocation(accounts[1], { from: revoke })
      })

      it("before finalize", async () => {
         await trustee.grantAllocation(accounts[1], 250, true, { from: ops })

         const balance0Before = await token.balanceOf(accounts[0])
         const balanceTrusteeBefore = await token.balanceOf(trustee.address)

         assert.equal(await trustee.reclaimTokens.call({ from: admin }), true)
         Utils.checkTokensReclaimedEventGroup(await trustee.reclaimTokens({ from: admin }), 250)

         const balance0After = await token.balanceOf(accounts[0])
         const balanceTrusteeAfter = await token.balanceOf(trustee.address)

         assert.equal(balance0After.sub(balance0Before).toNumber(), 250)
         assert.equal(balanceTrusteeAfter.toNumber(), 250)

         await trustee.revokeAllocation(accounts[1], { from: revoke })
      })

      it("after finalize", async () => {
         await token.finalize({ from: admin })

         const balance0Before = await token.balanceOf(accounts[0])
         const balanceTrusteeBefore = await token.balanceOf(trustee.address)

         assert.equal(await trustee.reclaimTokens.call({ from: admin }), true)
         Utils.checkTokensReclaimedEventGroup(await trustee.reclaimTokens({ from: admin }), 250)

         const balance0After = await token.balanceOf(accounts[0])
         const balanceTrusteeAfter = await token.balanceOf(trustee.address)

         assert.equal(balance0After.sub(balance0Before).toNumber(), 250)
         assert.equal(balanceTrusteeAfter.toNumber(), 0)
      })
   })


   describe('Ownership and permissions', async () => {

      var token = null
      var trustee = null


      before(async () => {
         var contracts = await Utils.deployTrustee(artifacts, accounts)

         token = contracts.token
         trustee = contracts.trustee

         await token.setAdminAddress(admin)
         await trustee.setAdminAddress(admin)
         await trustee.setOpsAddress(ops)
         await trustee.setRevokeAddress(revoke)

         await token.transfer(trustee.address, new BigNumber("1000"))
      })


      context('grantAllocation', async() => {

         it("as owner", async () => {
            await Utils.expectThrow(trustee.grantAllocation.call(accounts[3], 1, true, { from: owner }))
         })

         it("as admin", async () => {
            assert.equal(await trustee.grantAllocation.call(accounts[3], 1, true, { from: admin }), true)
            await trustee.grantAllocation(accounts[3], 1, true, { from: admin })

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as ops, not finalized", async () => {
            assert.equal(await trustee.grantAllocation.call(accounts[3], 1, true, { from: ops }), true)
            await trustee.grantAllocation(accounts[3], 1, true, { from: ops })

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as ops, finalized", async () => {
            await token.finalize({ from: admin })

            await Utils.expectThrow(trustee.grantAllocation.call(accounts[3], 1, true, { from: ops }))
         })

         it("as revoke ", async () => {
            await Utils.expectThrow(trustee.grantAllocation.call(accounts[3], 1, true, { from: revoke }))
         })

         it("as normal", async () => {
            await Utils.expectThrow(trustee.grantAllocation.call(accounts[3], 1, true, { from: accounts[4] }))
         })
      })


      context('revokeAllocation', async() => {

         before(async () => {
            var contracts = await Utils.deployTrustee(artifacts, accounts)

            token = contracts.token
            trustee = contracts.trustee

            await token.setAdminAddress(admin)
            await trustee.setAdminAddress(admin)
            await trustee.setOpsAddress(ops)
            await trustee.setRevokeAddress(revoke)

            await token.transfer(trustee.address, new BigNumber("1000"))
         })


         it("as owner", async () => {
            await trustee.grantAllocation(accounts[3], 1, true, { from: admin })

            await Utils.expectThrow(trustee.revokeAllocation.call(accounts[3], { from: owner }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as admin", async () => {
            await trustee.grantAllocation(accounts[3], 1, true, { from: admin })

            await Utils.expectThrow(trustee.revokeAllocation.call(accounts[3], { from: admin }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as ops, not finalized", async () => {
            assert.equal(await token.finalized.call(), false)

            await trustee.grantAllocation(accounts[3], 1, true, { from: admin })

            await Utils.expectThrow(trustee.revokeAllocation.call(accounts[3], { from: ops }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as ops, finalized", async () => {
            await token.finalize({ from: admin })

            assert.equal(await token.finalized.call(), true)

            await trustee.grantAllocation(accounts[3], 1, true, { from: admin })

            await Utils.expectThrow(trustee.revokeAllocation.call(accounts[3], { from: ops }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as normal", async () => {
            assert.equal(await token.finalized.call(), true)

            await trustee.grantAllocation(accounts[3], 1, true, { from: admin })

            await Utils.expectThrow(trustee.revokeAllocation.call(accounts[3], { from: accounts[4] }))
         })
      })


      context('processAllocation, before finalize', async() => {

         before(async () => {
            var contracts = await Utils.deployTrustee(artifacts, accounts)

            token = contracts.token
            trustee = contracts.trustee

            await token.setAdminAddress(admin)
            await trustee.setAdminAddress(admin)
            await trustee.setOpsAddress(ops)
            await trustee.setRevokeAddress(revoke)

            await token.transfer(trustee.address, new BigNumber("1000"))
         })

         it("as owner", async () => {
            assert.equal(await trustee.grantAllocation.call(accounts[3], 1, true, { from: admin }), true)
            await trustee.grantAllocation(accounts[3], 1, true, { from: admin })

            await Utils.expectThrow(trustee.processAllocation.call(accounts[3], 1, { from: owner }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as admin", async () => {
            assert.equal(await trustee.grantAllocation.call(accounts[3], 1, true, { from: admin }), true)
            await trustee.grantAllocation(accounts[3], 1, true, { from: admin })

            await Utils.expectThrow(trustee.processAllocation.call(accounts[3], 1, { from: admin }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as ops", async () => {
            assert.equal(await token.finalized.call(), false)

            assert.equal(await trustee.grantAllocation.call(accounts[3], 1, true, { from: admin }), true)
            await trustee.grantAllocation(accounts[3], 1, true, { from: admin })

            await Utils.expectThrow(trustee.processAllocation.call(accounts[3], 1, { from: ops }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as revoke", async () => {
            assert.equal(await trustee.grantAllocation.call(accounts[3], 1, true, { from: admin }), true)
            await trustee.grantAllocation(accounts[3], 1, true, { from: admin })

            await Utils.expectThrow(trustee.processAllocation.call(accounts[3], 1, { from: revoke }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as normal (beneficiary)", async () => {
            assert.equal(await trustee.grantAllocation.call(accounts[3], 1, true, { from: admin }), true)
            await trustee.grantAllocation(accounts[3], 1, true, { from: admin })

            await Utils.expectThrow(trustee.processAllocation.call(accounts[3], 1, { from: accounts[3] }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })
      })


      context('processAllocation, after finalize', async() => {

         before(async () => {
            var contracts = await Utils.deployTrustee(artifacts, accounts)

            token = contracts.token
            trustee = contracts.trustee

            await token.setAdminAddress(admin)
            await trustee.setAdminAddress(admin)
            await trustee.setOpsAddress(ops)
            await trustee.setRevokeAddress(revoke)

            await token.transfer(trustee.address, new BigNumber("1000"))

            await token.finalize({ from: admin })
         })

         it("as owner", async () => {
            assert.equal(await trustee.grantAllocation.call(accounts[3], 1, true, { from: admin }), true)
            await trustee.grantAllocation(accounts[3], 1, true, { from: admin })

            await Utils.expectThrow(trustee.processAllocation.call(accounts[3], 1, { from: owner }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as admin", async () => {
            assert.equal(await trustee.grantAllocation.call(accounts[3], 1, true, { from: admin }), true)
            await trustee.grantAllocation(accounts[3], 1, true, { from: admin })

            await Utils.expectThrow(trustee.processAllocation.call(accounts[3], 1, { from: admin }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as ops", async () => {
            assert.equal(await trustee.grantAllocation.call(accounts[3], 1, true, { from: admin }), true)
            await trustee.grantAllocation(accounts[3], 1, true, { from: admin })

            assert.equal(await trustee.processAllocation.call(accounts[3], 1, { from: ops }), true)
            await trustee.processAllocation(accounts[3], 1, { from: ops })

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as revoke", async () => {
            assert.equal(await trustee.grantAllocation.call(accounts[3], 1, true, { from: admin }), true)
            await trustee.grantAllocation(accounts[3], 1, true, { from: admin })

            await Utils.expectThrow(trustee.processAllocation.call(accounts[3], 1, { from: revoke }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as normal (beneficiary)", async () => {
            assert.equal(await trustee.grantAllocation.call(accounts[3], 1, true, { from: admin }), true)
            await trustee.grantAllocation(accounts[3], 1, true, { from: admin })

            await Utils.expectThrow(trustee.processAllocation.call(accounts[3], 1, { from: accounts[3] }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })
      })


      context('reclaimTokens', async() => {

         before(async () => {
            var contracts = await Utils.deployTrustee(artifacts, accounts)

            token = contracts.token
            trustee = contracts.trustee

            await token.setAdminAddress(admin)
            await trustee.setAdminAddress(admin)
            await trustee.setOpsAddress(ops)
            await trustee.setRevokeAddress(revoke)

            await token.transfer(trustee.address, new BigNumber("1000"))
         })


         it("as owner", async () => {
            await trustee.grantAllocation(accounts[3], 500, true, { from: admin })

            const ownerTokensBefore = await token.balanceOf.call(owner)

            const totalLocked = await trustee.totalLocked.call()
            assert.equal(totalLocked.toNumber(), 500)

            await Utils.expectThrow(trustee.reclaimTokens.call({ from: owner }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as admin", async () => {
            await trustee.grantAllocation(accounts[3], 250, true, { from: admin })

            const ownerTokensBefore = await token.balanceOf.call(owner)

            const totalLocked = await trustee.totalLocked.call()
            assert.equal(totalLocked.toNumber(), 250)

            assert.equal(await trustee.reclaimTokens.call({ from: admin }), true)
            Utils.checkTokensReclaimedEventGroup(await trustee.reclaimTokens({ from: admin }), 750)

            const ownerTokensAfter = await token.balanceOf.call(owner)

            assert(ownerTokensAfter.sub(ownerTokensBefore).toNumber(), 750)

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as ops", async () => {
            await token.finalize({ from: admin })

            await trustee.grantAllocation(accounts[3], 125, true, { from: admin })

            const ownerTokensBefore = await token.balanceOf.call(owner)

            const totalLocked = await trustee.totalLocked.call()
            assert.equal(totalLocked.toNumber(), 125)

            await Utils.expectThrow(trustee.reclaimTokens.call({ from: ops }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as revoke", async () => {
            await trustee.grantAllocation(accounts[3], 125, true, { from: admin })

            const ownerTokensBefore = await token.balanceOf.call(owner)

            const totalLocked = await trustee.totalLocked.call()
            assert.equal(totalLocked.toNumber(), 125)

            await Utils.expectThrow(trustee.reclaimTokens.call({ from: revoke }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })

         it("as normal", async () => {
            await trustee.grantAllocation(accounts[3], 125, true, { from: admin })

            const ownerTokensBefore = await token.balanceOf.call(owner)

            const totalLocked = await trustee.totalLocked.call()
            assert.equal(totalLocked.toNumber(), 125)

            await Utils.expectThrow(trustee.reclaimTokens.call({ from: accounts[4] }))

            await trustee.revokeAllocation(accounts[3], { from: revoke })
         })
      })
   })
})

