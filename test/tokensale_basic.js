const Utils = require('./lib/utils.js')

var BigNumber = require('bignumber.js')
var Moment = require('moment')

var SimpleToken = artifacts.require("./SimpleToken.sol")
var Trustee     = artifacts.require("./Trustee.sol")
var TokenSale   = artifacts.require("./TokenSale.sol")


//
// Check the following basic members / properties
//
// symbol
// name
// decimals
// PHASE1_START_TIME
// PHASE2_START_TIME
// END_TIME
// CONTRIBUTION_MIN
// CONTRIBUTION_MAX
// PHASE1_ACCOUNT_TOKENS_MAX
// TOKENS_MAX
// TOKENS_SALE
// TOKENS_FOUNDERS
// TOKENS_ADVISORS
// TOKENS_EARLY_BACKERS
// TOKENS_ACCELERATOR
// TOKENS_FUTURE
// TOKENS_PER_KETHER
// finalized
// endTime
// pausedTime
// tokensPerKEther
// wallet
// tokenContract
// trusteeContract
// totalTokensSold
// totalPresaleBonus
// whitelist
// sale contract token balance
// trustee contract token balance
// owner token balance

contract('TokenSale', function(accounts) {

   const DECIMALSFACTOR = new BigNumber('10').pow('18')

   const TOKEN_SYMBOL   = "ST"
   const TOKEN_NAME     = "Simple Token"
   const TOKEN_DECIMALS = 18

   const PHASE1_START_TIME         = 1510664400 // 2017-11-14, 13:00:00 UTC
   const PHASE2_START_TIME         = 1510750800 // 2017-11-15, 13:00:00 UTC
   const END_TIME                  = 1512133199; // 2017-12-01, 12:59:59 UTC
   const CONTRIBUTION_MIN          = web3.toWei(0.1, "ether")
   const CONTRIBUTION_MAX          = web3.toWei("10000", "ether")

   const PHASE1_ACCOUNT_TOKENS_MAX = new BigNumber('36000').mul(DECIMALSFACTOR)

   const TOKENS_MAX                = new BigNumber('800000000').mul(DECIMALSFACTOR)
   const TOKENS_SALE               = new BigNumber('240000000').mul(DECIMALSFACTOR)
   const TOKENS_FOUNDERS           = new BigNumber('80000000').mul(DECIMALSFACTOR)
   const TOKENS_ADVISORS           = new BigNumber('80000000').mul(DECIMALSFACTOR)
   const TOKENS_EARLY_BACKERS      = new BigNumber('44884831').mul(DECIMALSFACTOR)
   const TOKENS_ACCELERATOR        = new BigNumber('217600000').mul(DECIMALSFACTOR)
   const TOKENS_FUTURE             = new BigNumber('137515169').mul(DECIMALSFACTOR)

   const TOKENS_PER_KETHER         = new BigNumber('3600000')


   describe('Basic properties', async () => {

      var token   = null
      var trustee = null
      var sale    = null

      before(async () => {
         var contracts = await Utils.deployContracts(artifacts, accounts)

         token   = contracts.token
         trustee = contracts.trustee
         sale    = contracts.sale
      })

      it("symbol", async () => {
         assert.equal(await sale.TOKEN_SYMBOL.call(), TOKEN_SYMBOL)
      })

      it("name", async () => {
         assert.equal(await sale.TOKEN_NAME.call(), TOKEN_NAME)
      })

      it("decimals", async () => {
         assert.equal(await sale.TOKEN_DECIMALS.call(), TOKEN_DECIMALS)
      })

      it("PHASE1_START_TIME", async () => {
         assert.equal(await sale.PHASE1_START_TIME.call(), PHASE1_START_TIME)
      })

      it("PHASE2_START_TIME", async () => {
         assert.equal(await sale.PHASE2_START_TIME.call(), PHASE2_START_TIME)
      })

      it("END_TIME", async () => {
         assert.equal(await sale.END_TIME.call(), END_TIME)
      })

      it("CONTRIBUTION_MIN", async () => {
         assert.equal(await sale.CONTRIBUTION_MIN.call(), CONTRIBUTION_MIN)
      })

      it("CONTRIBUTION_MAX", async () => {
         assert.equal((await sale.CONTRIBUTION_MAX.call()).toNumber(), CONTRIBUTION_MAX)
      })

      it("PHASE1_ACCOUNT_TOKENS_MAX", async () => {
         assert.equal((await sale.PHASE1_ACCOUNT_TOKENS_MAX.call()).toNumber(), PHASE1_ACCOUNT_TOKENS_MAX.toNumber())
      })

      it("TOKENS_MAX", async () => {
         assert.equal((await sale.TOKENS_MAX.call()).toNumber(), TOKENS_MAX.toNumber())
      })

      it("TOKENS_SALE", async () => {
         assert.equal((await sale.TOKENS_SALE.call()).toNumber(), TOKENS_SALE.toNumber())
      })

      it("TOKENS_FOUNDERS", async () => {
         assert.equal((await sale.TOKENS_FOUNDERS.call()).toNumber(), TOKENS_FOUNDERS.toNumber())
      })

      it("TOKENS_ADVISORS", async () => {
         assert.equal((await sale.TOKENS_ADVISORS.call()).toNumber(), TOKENS_ADVISORS.toNumber())
      })

      it("TOKENS_EARLY_BACKERS", async () => {
         assert.equal((await sale.TOKENS_EARLY_BACKERS.call()).toNumber(), TOKENS_EARLY_BACKERS.toNumber())
      })

      it("TOKENS_ACCELERATOR", async () => {
         assert.equal((await sale.TOKENS_ACCELERATOR.call()).toNumber(), TOKENS_ACCELERATOR.toNumber())
      })

      it("TOKENS_FUTURE", async () => {
         assert.equal((await sale.TOKENS_FUTURE.call()).toNumber(), TOKENS_FUTURE.toNumber())
      })

      it("TOKENS_PER_KETHER", async () => {
         assert.equal((await sale.TOKENS_PER_KETHER.call()).toNumber(), TOKENS_PER_KETHER.toNumber())
      })

      it("finalized", async () => {
         assert.equal(await sale.finalized.call(), false)
      })

      it("endTime", async () => {
         assert.equal(await sale.endTime.call(), END_TIME)
      })

      it("pausedTime", async () => {
         assert.equal(await sale.pausedTime.call(), 0)
      })

      it("tokensPerKEther", async () => {
         assert.equal((await sale.tokensPerKEther.call()).toNumber(), TOKENS_PER_KETHER.toNumber())
      })

      it("phase1AccountTokensMax", async () => {
         assert.equal((await sale.phase1AccountTokensMax.call()).toNumber(), PHASE1_ACCOUNT_TOKENS_MAX.toNumber())
      })

      it("wallet", async () => {
         assert.equal(await sale.wallet.call(), accounts[0])
      })

      it("tokenContract", async () => {
         assert.equal(await sale.tokenContract.call(), token.address)
      })

      it("trusteeContract", async () => {
         assert.equal(await sale.trusteeContract.call(), trustee.address)
      })

      it("totalTokensSold", async () => {
         assert.equal(await sale.totalTokensSold.call(), 0)
      })

      it("totalPresaleBonus", async () => {
         assert.equal(await sale.totalPresaleBonus.call(), 0)
      })

      it("whitelist", async () => {
         assert.equal(await sale.whitelist.call(accounts[0]), false)
      })

      it("sale contract token balance", async () => {
         assert.equal((await token.balanceOf.call(sale.address)).toNumber(), TOKENS_SALE.toNumber())
      })

      it("trustee contract token balance", async () => {
         const expectedBalance = TOKENS_MAX.sub(TOKENS_SALE).sub(TOKENS_FUTURE)
         assert.equal((await token.balanceOf.call(trustee.address)).toNumber(), expectedBalance.toNumber())
      })

      it("owner token balance", async () => {
         const owner = await sale.owner.call()
         assert.equal(owner, accounts[0])
         assert.equal((await token.balanceOf.call(owner)).toNumber(), TOKENS_FUTURE.toNumber())
      })

      it("adminAddress", async () => {
         const adminAddress = await sale.adminAddress.call()
         assert.equal(adminAddress, 0)
      })

      it("opsAddress", async () => {
         const opsAddress = await sale.opsAddress.call()
         assert.equal(opsAddress, 0)
      })
   })
})

