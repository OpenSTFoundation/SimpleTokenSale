const Utils = require('./lib/utils.js')

const Moment = require('moment')
const BigNumber = require('bignumber.js')

const SimpleToken = artifacts.require("./SimpleToken.sol")
const Trustee     = artifacts.require("./Trustee.sol")
const TokenSale   = artifacts.require("./TokenSale.sol")


//
// With time < START_TIME
//    - Add presale 0, 0 (fails)
//    - Add presale 0, 1000 (fails)
//    - Add presale TOKENS_SALE_MAX + 1, 0 (fails)
//    - Add presale 1, TOKENS_SALE_MAX + 1 (fails)
//    - Add presale 1000, 1000 (fails)
//    - Add presale 1000, 0 tokens (ok)
//    - Add presale 1000, 0 tokens - same account (fails)
//    - Add presale 1000, 100 tokens (ok)
//    - Add presale TOKENS_SALE_MAX - 2000, 100 (ok)
//    - Add presale 1, 0 tokens (fails)
// With time = PHASE2_START_TIME + 1
//    - Add presale 1000 tokens (fails)
// With time < START_TIME but finalized = true
//    - Add presale 1000 tokens (fails)
//

contract('TokenSale', (accounts) => {

   const DECIMALSFACTOR = new BigNumber('10').pow('18')
   const TOKENS_SALE    = new BigNumber('240000000').mul(DECIMALSFACTOR)

   const owner  = accounts[0]
   const admin  = accounts[1]
   const ops    = accounts[2]
   const revoke = accounts[3]


   describe('Presale before sale starts', async () => {

      var token = null
      var trustee = null
      var sale = null

      before(async () => {
         var contracts = await Utils.deployContracts(artifacts, accounts)

         token   = contracts.token
         trustee = contracts.trustee
         sale    = contracts.sale

         await sale.setAdminAddress(admin)
         await sale.setOpsAddress(ops)
      })


      it("Add presale of 0, 0", async () => {
         await Utils.expectThrow(sale.addPresale(accounts[1], 0, 0, { from: admin }))
      })

      it("Add presale of 0, 1000", async () => {
         await Utils.expectThrow(sale.addPresale(accounts[1], 0, 1000, { from: admin }))
      })

      it("Add presale of TOKENS_SALE + 1, 0", async () => {
         await Utils.expectThrow(sale.addPresale(accounts[1], TOKENS_SALE.add(1), 0, { from: admin }))
      })

      it("Add presale of 1, TOKENS_SALE + 1", async () => {
         await Utils.expectThrow(sale.addPresale(accounts[1], 1, TOKENS_SALE.add(1), { from: admin }))
      })

      it("Add presale of 1000, 1000", async () => {
         await Utils.expectThrow(sale.addPresale(accounts[1], 1000, 1000, { from: admin }))
      })

      it("Add presale of 1000, 0", async () => {
         const baseBefore = await sale.totalPresaleBase.call()
         const bonusBefore = await sale.totalPresaleBonus.call()

         assert.equal(baseBefore.toNumber(), 0)
         assert.equal(bonusBefore.toNumber(), 0)

         assert.equal(await sale.addPresale.call(accounts[1], 1000, 0, { from: admin }), true)
         Utils.checkPresaleAddedEventGroup(await sale.addPresale(accounts[1], 1000, 0, { from: admin }), accounts[1], 1000, 0)

         const baseAfter = await sale.totalPresaleBase.call()
         const bonusAfter = await sale.totalPresaleBonus.call()

         assert.equal(baseAfter.toNumber(), 1000)
         assert.equal(bonusAfter.toNumber(), 0)
      })

      it("Add presale of 1000, 0 - Cant pre-sell to same person twice", async () => {
         await Utils.expectThrow(sale.addPresale(accounts[1], 1000, 100, { from: admin }))
      })

      it("Add presale of 1000, 100", async () => {
         assert.equal(await sale.addPresale.call(accounts[2], 1000, 100, { from: admin }), true)
         Utils.checkPresaleAddedEventGroup(await sale.addPresale(accounts[2], 1000, 100, { from: admin }), accounts[2], 1000, 100)

         // Check that allocation was made properly
         const totalTokensSold   = await sale.totalTokensSold.call()
         const totalPresaleBase  = await sale.totalPresaleBase.call()
         const totalPresaleBonus = await sale.totalPresaleBonus.call()
         const allocation = await trustee.allocations.call(accounts[2])

         assert.equal(totalTokensSold.toNumber(), 2000)
         assert.equal(totalPresaleBase.toNumber(), 2000)
         assert.equal(totalPresaleBonus.toNumber(), 100)
         assert.equal(allocation[0].toNumber(), 1100)
         assert.equal(allocation[1], 0)
         assert.equal(allocation[2], false)
      })

      it("Add presale of TOKENS_SALE - 2000, 100", async () => {
         const baseAmount = TOKENS_SALE.sub(2000)

         assert.equal(await sale.finalized.call(), false)

         assert.equal(await sale.addPresale.call(accounts[3], baseAmount, 100, { from: admin }), true)
         Utils.checkPresaleAddedEventGroup(await sale.addPresale(accounts[3], baseAmount, 100, { from: admin }), accounts[3], baseAmount, 100)

         assert.equal((await sale.totalTokensSold.call()).toNumber(), TOKENS_SALE.toNumber())
         assert.equal(await sale.finalized.call(), false)
      })

      it("Add presale of 1, 0", async () => {
         assert.equal(await sale.finalized.call(), false)
         await Utils.expectThrow(sale.addPresale(accounts[4], 1, 0, { from: admin }))

         // Add this if we decide to support auto-finalize on presales.
         // assert.equal(await sale.finalized.call(), true)
      })
   })


   describe('Presale during sale Phase 2', async () => {

      var token = null
      var trustee = null
      var sale = null

      before(async () => {
         var contracts = await Utils.deployContracts(artifacts, accounts)

         token   = contracts.token
         trustee = contracts.trustee
         sale    = contracts.sale

         await sale.setAdminAddress(admin)
         await sale.setOpsAddress(ops)

         const PHASE2_START_TIME = await sale.PHASE2_START_TIME.call()

         await Utils.changeTime(sale, PHASE2_START_TIME.add(1))
      })

      it("Add presale of 1000, 100", async () => {
         await Utils.expectThrow(sale.addPresale(accounts[1], 1000, 100, { from: admin }))
      })
   })


   describe('Presale when finalized', async () => {

      var sale = null


      before(async () => {
         var contracts = await Utils.deployContracts(artifacts, accounts)

         sale = contracts.sale

         await sale.setAdminAddress(admin)
         await sale.setOpsAddress(ops)

         await sale.finalize({ from: admin })
      })

      it("Add presale of 1000, 100", async () => {
         await Utils.expectThrow(sale.addPresale(accounts[1], 1000, 100, { from: admin }))
      })
   })
})
