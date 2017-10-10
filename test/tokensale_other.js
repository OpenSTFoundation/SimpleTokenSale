const Utils = require('./lib/utils.js')

var BigNumber = require('bignumber.js')
var Moment = require('moment')

var SimpleToken = artifacts.require("./SimpleToken.sol")
var Trustee     = artifacts.require("./Trustee.sol")
var TokenSale   = artifacts.require("./TokenSale.sol")


//
// whitelist
//    (for each of: before, phase 1, phase 2)
//    - add account to whitelist, phase 1
//    - add account to whitelist, phase 2
//    - add account to whitelist, phase 3
//    - remove account from whitelist
//    - try to purchase tokens in phase 1 (not whitelisted)
//    - try to purchase tokens in phase 1 (whitelisted for phase 1)
//    - try to purchase tokens in phase 1 (whitelisted for phase 2)
//    - try to purchase tokens in phase 2 (not whitelisted)
//    - try to purchase tokens in phase 2 (whitelisted for phase 1)
//    - try to purchase tokens in phase 2 (whitelisted for phase 2)
//
// changeWallet function
//    - change wallet to address 0
//    - purchase tokens with wallet = account[1]
//    - purchase tokens with wallet = account[2]
//
// finalize
//    - check properties before finalize
//    - finalize the sale contract
//    - check properties after finalize
//    - try to finalize a 2nd time
//
// reclaimTokens
//    - reclaimTokens before finalize
//    - reclaimTokens after finalize
//    - reclaimTokens when 0 balance
//

contract('TokenSale', function(accounts) {

   const DECIMALSFACTOR = new BigNumber('10').pow('18')

   const TOKEN_SYMBOL   = "ST"
   const TOKEN_NAME     = "Simple Token"
   const TOKEN_DECIMALS = 18

   const PHASE1_START_TIME         = 1510660800 // 2017-11-14, 12:00:00 UTC
   const PHASE2_START_TIME         = 1510747200 // 2017-11-15, 12:00:00 UTC
   const END_TIME                  = 1511265599 // 2017-11-21, 11:59:59 UTC
   const CONTRIBUTION_MIN          = new BigNumber(web3.toWei(0.1, "ether"))
   const CONTRIBUTION_MAX          = new BigNumber(web3.toWei(1000000, "ether"))

   const PHASE1_ACCOUNT_TOKENS_MAX = new BigNumber('18000').mul(DECIMALSFACTOR)

   const TOKENS_MAX                = new BigNumber('800000000').mul(DECIMALSFACTOR)
   const TOKENS_SALE               = new BigNumber('240000000').mul(DECIMALSFACTOR)
   const TOKENS_FOUNDERS           = new BigNumber('80000000').mul(DECIMALSFACTOR)
   const TOKENS_ADVISORS           = new BigNumber('80000000').mul(DECIMALSFACTOR)
   const TOKENS_EARLY_INVESTORS    = new BigNumber('22441966').mul(DECIMALSFACTOR)
   const TOKENS_ACCELERATOR_MAX    = new BigNumber('257558034').mul(DECIMALSFACTOR)
   const TOKENS_FUTURE             = new BigNumber('120000000').mul(DECIMALSFACTOR)

   const TOKENS_PER_KETHER         = new BigNumber('1800000')


   describe('whitelist', async () => {

      var token   = null
      var trustee = null
      var sale    = null


      context('before phase 1 starts', async () => {
         before(async () => {
            var contracts = await Utils.deployContracts(artifacts, accounts)

            token   = contracts.token
            trustee = contracts.trustee
            sale    = contracts.sale
         })


         it("add account to whitelist, phase 1", async () => {
            assert.equal(await sale.whitelist.call(accounts[2]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[2], 1), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[2], 1), accounts[2], 1)
            assert.equal(await sale.whitelist.call(accounts[2]), 1)
         })

         it("add account to whitelist, phase 2", async () => {
            assert.equal(await sale.whitelist.call(accounts[3]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[3], 2), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[3], 2), accounts[3], 2)
            assert.equal(await sale.whitelist.call(accounts[3]), 2)
         })

         it("add account to whitelist, phase 3", async () => {
            assert.equal(await sale.whitelist.call(accounts[4]), 0)
            await Utils.expectThrow(sale.updateWhitelist.call(accounts[4], 3))
         })

         it("remove account from whitelist", async () => {
            assert.equal(await sale.whitelist.call(accounts[1]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[1], 1), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[1], 1), accounts[1], 1)
            assert.equal(await sale.whitelist.call(accounts[1]), 1)
            assert.equal(await sale.updateWhitelist.call(accounts[1], 0), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[1], 0), accounts[1], 0)
            assert.equal(await sale.whitelist.call(accounts[1]), 0)
         })

         it("try to purchase tokens before phase 1 (not whitelisted)", async () => {
            assert.equal(await sale.whitelist.call(accounts[1]), 0)

            await Utils.expectThrow(sale.sendTransaction({ from: accounts[1], value: web3.toWei(0.1, "ether") }))
         })

         it("try to purchase tokens before phase 1 (whitelisted for phase 1)", async () => {
            assert.equal(await sale.whitelist.call(accounts[2]), 1)

            var cost = CONTRIBUTION_MIN
            var tokens = Utils.calculateTokensFromWei(TOKENS_PER_KETHER, cost)

            await Utils.expectThrow(sale.buyTokens.call({ from: accounts[2], value: cost }))
         })

         it("try to purchase tokens before phase 1 (whitelisted for phase 2)", async () => {
            assert.equal(await sale.whitelist.call(accounts[3]), 2)

            await Utils.expectThrow(sale.sendTransaction({ from: accounts[3], value: web3.toWei(0.1, "ether") }))
         })
      })


      context('during phase 1', async () => {

         before(async () => {
            var contracts = await Utils.deployContracts(artifacts, accounts)

            token   = contracts.token
            trustee = contracts.trustee
            sale    = contracts.sale

            await Utils.changeTime(sale, PHASE1_START_TIME + 1)
         })


         it("add account to whitelist, phase 1", async () => {
            assert.equal(await sale.whitelist.call(accounts[2]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[2], 1), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[2], 1), accounts[2], 1)
            assert.equal(await sale.whitelist.call(accounts[2]), 1)
         })

         it("add account to whitelist, phase 2", async () => {
            assert.equal(await sale.whitelist.call(accounts[3]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[3], 2), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[3], 2), accounts[3], 2)
            assert.equal(await sale.whitelist.call(accounts[3]), 2)
         })

         it("add account to whitelist, phase 3", async () => {
            assert.equal(await sale.whitelist.call(accounts[4]), 0)
            await Utils.expectThrow(sale.updateWhitelist.call(accounts[4], 3))
         })

         it("remove account from whitelist", async () => {
            assert.equal(await sale.whitelist.call(accounts[1]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[1], 1), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[1], 1), accounts[1], 1)
            assert.equal(await sale.whitelist.call(accounts[1]), 1)
            assert.equal(await sale.updateWhitelist.call(accounts[1], 0), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[1], 0), accounts[1], 0)
            assert.equal(await sale.whitelist.call(accounts[1]), 0)
         })

         it("try to purchase tokens during phase 1 (not whitelisted)", async () => {
            assert.equal(await sale.whitelist.call(accounts[1]), 0)

            await Utils.expectThrow(sale.sendTransaction({ from: accounts[1], value: web3.toWei(0.1, "ether") }))
         })

         it("try to purchase tokens during phase 1 (whitelisted for phase 1)", async () => {
            assert.equal(await sale.whitelist.call(accounts[2]), 1)

            var cost = CONTRIBUTION_MIN
            var tokens = Utils.calculateTokensFromWei(TOKENS_PER_KETHER, cost)

            assert.equal(await sale.buyTokens.call({ from: accounts[2], value: cost }), true)
            Utils.checkTokensPurchasedEventGroup(await sale.buyTokens({ from: accounts[2], value: cost }), sale.address, accounts[2], cost, tokens)
         })

         it("try to purchase tokens during phase 1 (whitelisted for phase 2)", async () => {
            assert.equal(await sale.whitelist.call(accounts[3]), 2)

            await Utils.expectThrow(sale.sendTransaction({ from: accounts[3], value: web3.toWei(0.1, "ether") }))
         })
      })


      context('during phase 2', async () => {

         before(async () => {
            var contracts = await Utils.deployContracts(artifacts, accounts)

            token   = contracts.token
            trustee = contracts.trustee
            sale    = contracts.sale

            await Utils.changeTime(sale, PHASE2_START_TIME + 1)
         })


         it("add account to whitelist, phase 1", async () => {
            assert.equal(await sale.whitelist.call(accounts[2]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[2], 1), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[2], 1), accounts[2], 1)
            assert.equal(await sale.whitelist.call(accounts[2]), 1)
         })

         it("add account to whitelist, phase 2", async () => {
            assert.equal(await sale.whitelist.call(accounts[3]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[3], 2), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[3], 2), accounts[3], 2)
            assert.equal(await sale.whitelist.call(accounts[3]), 2)
         })

         it("add account to whitelist, phase 3", async () => {
            assert.equal(await sale.whitelist.call(accounts[4]), 0)
            await Utils.expectThrow(sale.updateWhitelist.call(accounts[4], 3))
         })

         it("remove account from whitelist", async () => {
            assert.equal(await sale.whitelist.call(accounts[1]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[1], 1), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[1], 1), accounts[1], 1)
            assert.equal(await sale.whitelist.call(accounts[1]), 1)
            assert.equal(await sale.updateWhitelist.call(accounts[1], 0), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[1], 0), accounts[1], 0)
            assert.equal(await sale.whitelist.call(accounts[1]), 0)
         })

         it("try to purchase tokens during phase 2 (not whitelisted)", async () => {
            assert.equal(await sale.whitelist.call(accounts[1]), 0)

            await Utils.expectThrow(sale.sendTransaction({ from: accounts[1], value: web3.toWei(0.1, "ether") }))
         })

         it("try to purchase tokens during phase 2 (whitelisted for phase 1)", async () => {
            assert.equal(await sale.whitelist.call(accounts[2]), 1)

            var cost = CONTRIBUTION_MIN
            var tokens = Utils.calculateTokensFromWei(TOKENS_PER_KETHER, cost)

            assert.equal(await sale.buyTokens.call({ from: accounts[2], value: cost }), true)
            Utils.checkTokensPurchasedEventGroup(await sale.buyTokens({ from: accounts[2], value: cost }), sale.address, accounts[2], cost, tokens)
         })

         it("try to purchase tokens during phase 2 (whitelisted for phase 2)", async () => {
            assert.equal(await sale.whitelist.call(accounts[3]), 2)

            var cost = CONTRIBUTION_MIN
            var tokens = Utils.calculateTokensFromWei(TOKENS_PER_KETHER, cost)

            assert.equal(await sale.buyTokens.call({ from: accounts[3], value: cost }), true)
            Utils.checkTokensPurchasedEventGroup(await sale.buyTokens({ from: accounts[3], value: cost }), sale.address, accounts[3], cost, tokens)
         })
      })
   })


   describe('changeWallet function', async () => {

      var token   = null
      var trustee = null
      var sale    = null

      before(async () => {
         var contracts = await Utils.deployContracts(artifacts, accounts)

         token   = contracts.token
         trustee = contracts.trustee
         sale    = contracts.sale

         // Whitelist accounts for purchase
         await sale.updateWhitelist(accounts[2], 2)
         await sale.updateWhitelist(accounts[3], 2)

         // Sale starts
         await Utils.changeTime(sale, PHASE2_START_TIME + 1)
      })


      it("change wallet to address 0", async () => {
         await Utils.expectThrow(sale.changeWallet.call(0))
      })

      it("purchase tokens with wallet = account[1]", async () => {
         assert.equal(await sale.wallet.call(), accounts[0])
         assert.equal(await sale.changeWallet.call(accounts[1]), true)
         Utils.checkWalletChangedEventGroup(await sale.changeWallet(accounts[1]), accounts[1])
         assert.equal(await sale.wallet.call(), accounts[1])

         const balanceBefore = await Utils.getBalance(accounts[1])
         await sale.sendTransaction({ from: accounts[2], value: web3.toWei(0.1, "ether") })
         const balanceAfter = await Utils.getBalance(accounts[1])

         assert.isTrue(balanceAfter.gt(balanceBefore), "Expected wallet balance after > before")
      })

      it("purchase tokens with wallet = account[2]", async () => {
         Utils.checkWalletChangedEventGroup(await sale.changeWallet(accounts[2]), accounts[2])

         const balanceBefore = await Utils.getBalance(accounts[2])
         await sale.sendTransaction({ from: accounts[3], value: web3.toWei(0.1, "ether") })
         const balanceAfter = await Utils.getBalance(accounts[2])

         assert.isTrue(balanceAfter.gt(balanceBefore), "Expected wallet balance after > before")
      })
   })


   describe('finalize', async () => {

      var token   = null
      var trustee = null
      var sale    = null

      before(async () => {
         var contracts = await Utils.deployContracts(artifacts, accounts)

         token   = contracts.token
         trustee = contracts.trustee
         sale    = contracts.sale
      })


      it("check properties before finalize", async () => {
         assert.equal(await sale.finalized.call(), false)
         assert.equal(await token.finalized.call(), false)
      })

      it("finalize the sale contract", async () => {
         assert.equal(await sale.finalize.call(), true)
         Utils.checkFinalizedEventGroup(await sale.finalize())
      })

      it("check properties after finalize", async () => {
         assert.equal(await sale.finalized.call(), true)
         assert.equal(await token.finalized.call(), false)
      })

      it("try to finalize a 2nd time", async () => {
         await Utils.expectThrow(sale.finalize.call())
      })
   })


   describe('reclaimTokens', async () => {

      var token   = null
      var trustee = null
      var sale    = null

      context('before finalize', async () => {
         before(async () => {
            var contracts = await Utils.deployContracts(artifacts, accounts)

            token   = contracts.token
            trustee = contracts.trustee
            sale    = contracts.sale
         })

         it("reclaimTokens before finalize", async () => {
            const balance0Before = await token.balanceOf(accounts[0])
            const balanceSaleBefore = await token.balanceOf(sale.address)

            assert.equal(await sale.reclaimTokens.call(), true)
            Utils.checkTokensReclaimedEventGroup(await sale.reclaimTokens(), balanceSaleBefore)

            const balance0After = await token.balanceOf(accounts[0])
            const balanceSaleAfter = await token.balanceOf(sale.address)

            assert.equal(balance0After.sub(balance0Before).toNumber(), balanceSaleBefore)
            assert.equal(balanceSaleAfter.sub(balanceSaleBefore).toNumber(), balanceSaleBefore.mul(-1))
         })
      })


      context('after finalize', async () => {
         before(async () => {
            var contracts = await Utils.deployContracts(artifacts, accounts)

            token   = contracts.token
            trustee = contracts.trustee
            sale    = contracts.sale
         })

         it("reclaimTokens after finalize", async () => {
            await sale.finalize()
            await token.finalize()

            const balance0Before = await token.balanceOf(accounts[0])
            const balanceSaleBefore = await token.balanceOf(sale.address)

            assert.equal(await sale.reclaimTokens.call(), true)
            Utils.checkTokensReclaimedEventGroup(await sale.reclaimTokens(), balanceSaleBefore)

            const balance0After = await token.balanceOf(accounts[0])
            const balanceSaleAfter = await token.balanceOf(sale.address)

            assert.equal(balance0After.sub(balance0Before).toNumber(), balanceSaleBefore)
            assert.equal(balanceSaleAfter.sub(balanceSaleBefore).toNumber(), balanceSaleBefore.mul(-1))
         })

         it("reclaimTokens with 0 balance", async () => {
            const balanceSaleBefore = await token.balanceOf(sale.address)
            assert.equal(balanceSaleBefore, 0)

            Utils.expectThrow(sale.reclaimTokens.call())
         })
      })
   })
})

