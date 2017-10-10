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
//

contract('Trustee', (accounts) => {

   const DECIMALSFACTOR = new BigNumber('10').pow('18')

   const TOKENS_MAX     = new BigNumber('800000000').mul(DECIMALSFACTOR)


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

         await token.finalize()
      })

      it("grant 0 value", async () => {
         await Utils.expectThrow(trustee.grantAllocation(accounts[1], 0, true))
      })

      it("grant 100 value to 0 address", async () => {
         await Utils.expectThrow(trustee.grantAllocation(0, 100, true))
      })

      it("grant 10000 value when trustee only has 1000", async () => {
         await Utils.expectThrow(trustee.grantAllocation(accounts[1], 100000, true))
      })

      it("grant 100 value when non-owner", async () => {
         await Utils.expectThrow(trustee.grantAllocation(accounts[1], 100, true, { from: accounts[1] }))
      })

      it("grant 100 value when owner", async () => {
         await trustee.grantAllocation(accounts[1], 100, true)
         const allocation = await trustee.allocations.call(accounts[1])

         assert.equal(allocation[0].toNumber(), 100)
         assert.equal(allocation[1].toNumber(), 0)
         assert.equal(allocation[2], true)
      })

      it("grant 900 value to same address", async () => {
         await Utils.expectThrow(trustee.grantAllocation(accounts[1], 900, true))
      })

      it("grant 900 value to another address", async () => {
         await trustee.grantAllocation(accounts[2], 900, true)
      })

      it("grant 1 value to exceeding trustee pool", async () => {
         await Utils.expectThrow(trustee.grantAllocation(accounts[3], 900, true))
      })

      it("grant 100 value after existing allocation revoked", async () => {
         await trustee.revokeAllocation(accounts[1])

         await trustee.grantAllocation(accounts[1], 100, true)
      })

      it("grant 1 value to exceeding trustee pool", async () => {
         await Utils.expectThrow(trustee.grantAllocation(accounts[3], 900, true))
      })

      it("grant 100 value to address where grant went to 0", async () => {
         await trustee.processAllocation(accounts[1], 100)

         await token.transfer(trustee.address, 100)

         // This should fail since when an allocation goes to 0 it doesnt get deleted
         await Utils.expectThrow(trustee.grantAllocation(accounts[1], 100, true))
      })
   })


   describe('revokeAllocation function', async () => {

      var token = null
      var trustee = null

      before(async () => {
         var contracts = await Utils.deployTrustee(artifacts, accounts)

         token = contracts.token
         trustee = contracts.trustee

         await token.transfer(trustee.address, new BigNumber("1000"))
      })

      it("revoke before token finalized", async () => {
         await trustee.grantAllocation(accounts[1], 10, true)
         await trustee.revokeAllocation(accounts[1])
         await token.finalize()
      })

      it("revoke non-existent allocation", async () => {
         await Utils.expectThrow(trustee.revokeAllocation(accounts[2]))
      })

      it("revoke allocation that can be revoked", async () => {
         await trustee.grantAllocation(accounts[1], 10, true)
         await trustee.revokeAllocation(accounts[1])
      })

      it("revoke allocation that CANNOT be revoked", async () => {
         await trustee.grantAllocation(accounts[2], 10, false)
         await Utils.expectThrow(trustee.revokeAllocation(accounts[2]))
      })

      it("revoke allocation non-owner", async () => {
         await Utils.expectThrow(trustee.grantAllocation(accounts[1], 10, true, { from: accounts[2] }))
      })

      it("replace non-locked with locked allocation", async () => {
         await trustee.grantAllocation(accounts[1], 10, true)
         await trustee.revokeAllocation(accounts[1])
         await trustee.grantAllocation(accounts[1], 10, false)
      })

      it("revoke newly locked allocation", async () => {
         await Utils.expectThrow(trustee.revokeAllocation(accounts[1]))
      })

   })


   describe('processAllocation function', async () => {

      var token = null
      var trustee = null

      before(async () => {
         var contracts = await Utils.deployTrustee(artifacts, accounts)

         token = contracts.token
         trustee = contracts.trustee

         await token.transfer(trustee.address, new BigNumber("1000"))
      })

      it("process before token finalized", async () => {
         await trustee.grantAllocation(accounts[1], 10, true)
         await Utils.expectThrow(trustee.processAllocation(accounts[1], 10))
         await token.finalize()
         await trustee.processAllocation(accounts[1], 10)
      })

      it("process non-existent allocation", async () => {
         await Utils.expectThrow(trustee.processAllocation(accounts[2], 10))
      })

      it("process allocation that has 0 value left", async () => {
         await Utils.expectThrow(trustee.grantAllocation(accounts[1], 10, true))
      })

      it("process allocation for 0 value", async () => {
         await trustee.grantAllocation(accounts[2], 10, true)
         await Utils.expectThrow(trustee.processAllocation(accounts[2], 0))
      })

      it("process allocation for > value left", async () => {
         assert.equal(await trustee.processAllocation.call(accounts[2], 20), false)
         await trustee.processAllocation.call(accounts[2], 20)
      })

      it("process allocation as non-owner", async () => {
         await Utils.expectThrow(trustee.processAllocation(accounts[2], 10, { from: accounts[2] }))
      })

      it("process allocation for half its value", async () => {
         await trustee.processAllocation(accounts[2], 5)
      })

      it("process allocation for all its value", async () => {
         await trustee.processAllocation(accounts[2], 5)
      })
   })


   describe('reclaimTokens function', async () => {

      var token = null
      var trustee = null

      before(async () => {
         var contracts = await Utils.deployTrustee(artifacts, accounts)

         token = contracts.token
         trustee = contracts.trustee

         await token.transfer(trustee.address, new BigNumber("1000"))
      })


      it("with all tokens already locked", async () => {
         await trustee.grantAllocation(accounts[1], 1000, true)

         await Utils.expectThrow(trustee.reclaimTokens.call())

         await trustee.revokeAllocation(accounts[1])
      })

      it("with half tokens locked", async () => {
         await trustee.grantAllocation(accounts[1], 500, true)

         const balance0Before = await token.balanceOf(accounts[0])
         const balanceTrusteeBefore = await token.balanceOf(trustee.address)

         assert.equal(await trustee.reclaimTokens.call(), true)
         Utils.checkTokensReclaimedEventGroup(await trustee.reclaimTokens(), 500)

         const balance0After = await token.balanceOf(accounts[0])
         const balanceTrusteeAfter = await token.balanceOf(trustee.address)

         assert.equal(balance0After.sub(balance0Before).toNumber(), 500)
         assert.equal(balanceTrusteeAfter.toNumber(), 500)

         await trustee.revokeAllocation(accounts[1])
      })

      it("before finalize", async () => {
         await trustee.grantAllocation(accounts[1], 250, true)

         const balance0Before = await token.balanceOf(accounts[0])
         const balanceTrusteeBefore = await token.balanceOf(trustee.address)

         assert.equal(await trustee.reclaimTokens.call(), true)
         Utils.checkTokensReclaimedEventGroup(await trustee.reclaimTokens(), 250)

         const balance0After = await token.balanceOf(accounts[0])
         const balanceTrusteeAfter = await token.balanceOf(trustee.address)

         assert.equal(balance0After.sub(balance0Before).toNumber(), 250)
         assert.equal(balanceTrusteeAfter.toNumber(), 250)

         await trustee.revokeAllocation(accounts[1])
      })

      it("after finalize", async () => {
         await token.finalize()

         const balance0Before = await token.balanceOf(accounts[0])
         const balanceTrusteeBefore = await token.balanceOf(trustee.address)

         assert.equal(await trustee.reclaimTokens.call(), true)
         Utils.checkTokensReclaimedEventGroup(await trustee.reclaimTokens(), 250)

         const balance0After = await token.balanceOf(accounts[0])
         const balanceTrusteeAfter = await token.balanceOf(trustee.address)

         assert.equal(balance0After.sub(balance0Before).toNumber(), 250)
         assert.equal(balanceTrusteeAfter.toNumber(), 0)
      })
   })
})

