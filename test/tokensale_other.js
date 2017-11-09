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
// burnUnsoldTokens
//    - burnUnsoldTokens before finalize
//    - burnUnsoldTokens after finalize
//

contract('TokenSale', function(accounts) {

   const DECIMALSFACTOR = new BigNumber('10').pow('18')

   const TOKEN_SYMBOL   = "ST"
   const TOKEN_NAME     = "Simple Token"
   const TOKEN_DECIMALS = 18

   const PHASE1_START_TIME         = 1510664400 // 2017-11-14, 13:00:00 UTC
   const PHASE2_START_TIME         = 1510750800 // 2017-11-15, 13:00:00 UTC
   const END_TIME                  = 1511269199 // 2017-11-21, 12:59:59 UTC
   const CONTRIBUTION_MIN          = new BigNumber(web3.toWei(0.1, "ether"))
   const CONTRIBUTION_MAX          = new BigNumber(web3.toWei(1000000, "ether"))

   const PHASE1_ACCOUNT_TOKENS_MAX = new BigNumber('36000').mul(DECIMALSFACTOR)

   const TOKENS_MAX                = new BigNumber('800000000').mul(DECIMALSFACTOR)
   const TOKENS_SALE               = new BigNumber('240000000').mul(DECIMALSFACTOR)
   const TOKENS_FOUNDERS           = new BigNumber('80000000').mul(DECIMALSFACTOR)
   const TOKENS_ADVISORS           = new BigNumber('80000000').mul(DECIMALSFACTOR)
   const TOKENS_EARLY_BACKERS      = new BigNumber('44884831').mul(DECIMALSFACTOR)
   const TOKENS_ACCELERATOR        = new BigNumber('217600000').mul(DECIMALSFACTOR)
   const TOKENS_FUTURE             = new BigNumber('137515169').mul(DECIMALSFACTOR)

   const TOKENS_PER_KETHER         = new BigNumber('3600000')

   const owner  = accounts[0]
   const admin  = accounts[1]
   const ops    = accounts[2]
   const revoke = accounts[3]


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

            await sale.setAdminAddress(admin)
            await sale.setOpsAddress(ops)
         })


         it("add account to whitelist, phase 1", async () => {
            assert.equal(await sale.whitelist.call(accounts[2]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[2], 1, { from: ops }), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[2], 1, { from: ops }), accounts[2], 1)
            assert.equal(await sale.whitelist.call(accounts[2]), 1)
         })

         it("add account to whitelist, phase 2", async () => {
            assert.equal(await sale.whitelist.call(accounts[3]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[3], 2, { from: ops }), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[3], 2, { from: ops }), accounts[3], 2)
            assert.equal(await sale.whitelist.call(accounts[3]), 2)
         })

         it("add account to whitelist, phase 3", async () => {
            assert.equal(await sale.whitelist.call(accounts[4], { from: ops }), 0)
            await Utils.expectThrow(sale.updateWhitelist.call(accounts[4], 3, { from: ops }))
         })

         it("remove account from whitelist", async () => {
            assert.equal(await sale.whitelist.call(accounts[1]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[1], 1, { from: ops }), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[1], 1, { from: ops }), accounts[1], 1)
            assert.equal(await sale.whitelist.call(accounts[1]), 1)
            assert.equal(await sale.updateWhitelist.call(accounts[1], 0, { from: ops }), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[1], 0, { from: ops }), accounts[1], 0)
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

            await sale.setAdminAddress(admin)
            await sale.setOpsAddress(ops)

            await Utils.changeTime(sale, PHASE1_START_TIME + 1)
         })


         it("add account to whitelist, phase 1", async () => {
            assert.equal(await sale.whitelist.call(accounts[2]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[2], 1, { from: ops }), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[2], 1, { from: ops }), accounts[2], 1)
            assert.equal(await sale.whitelist.call(accounts[2]), 1)
         })

         it("add account to whitelist, phase 2", async () => {
            assert.equal(await sale.whitelist.call(accounts[3]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[3], 2, { from: ops }), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[3], 2, { from: ops }), accounts[3], 2)
            assert.equal(await sale.whitelist.call(accounts[3]), 2)
         })

         it("add account to whitelist, phase 3", async () => {
            assert.equal(await sale.whitelist.call(accounts[4]), 0)
            await Utils.expectThrow(sale.updateWhitelist.call(accounts[4], 3, { from: ops }))
         })

         it("remove account from whitelist", async () => {
            assert.equal(await sale.whitelist.call(accounts[1]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[1], 1, { from: ops }), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[1], 1, { from: ops }), accounts[1], 1)
            assert.equal(await sale.whitelist.call(accounts[1]), 1)
            assert.equal(await sale.updateWhitelist.call(accounts[1], 0, { from: ops }), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[1], 0, { from: ops }), accounts[1], 0)
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
            Utils.checkTokensPurchasedEventGroup(await sale.buyTokens({ from: accounts[2], value: cost }), sale.address, accounts[2], cost, tokens, false)
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

            await sale.setAdminAddress(admin)
            await sale.setOpsAddress(ops)

            await Utils.changeTime(sale, PHASE2_START_TIME + 1)
         })


         it("add account to whitelist, phase 1", async () => {
            assert.equal(await sale.whitelist.call(accounts[2]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[2], 1, { from: ops }), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[2], 1, { from: ops }), accounts[2], 1)
            assert.equal(await sale.whitelist.call(accounts[2]), 1)
         })

         it("add account to whitelist, phase 2", async () => {
            assert.equal(await sale.whitelist.call(accounts[3]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[3], 2, { from: ops }), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[3], 2, { from: ops }), accounts[3], 2)
            assert.equal(await sale.whitelist.call(accounts[3]), 2)
         })

         it("add account to whitelist, phase 3", async () => {
            assert.equal(await sale.whitelist.call(accounts[4]), 0)
            await Utils.expectThrow(sale.updateWhitelist.call(accounts[4], 3, { from: ops }))
         })

         it("remove account from whitelist", async () => {
            assert.equal(await sale.whitelist.call(accounts[1]), 0)
            assert.equal(await sale.updateWhitelist.call(accounts[1], 1, { from: ops }), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[1], 1, { from: ops }), accounts[1], 1)
            assert.equal(await sale.whitelist.call(accounts[1]), 1)
            assert.equal(await sale.updateWhitelist.call(accounts[1], 0, { from: ops }), true)
            Utils.checkWhitelistUpdatedEventGroup(await sale.updateWhitelist(accounts[1], 0, { from: ops }), accounts[1], 0)
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
            Utils.checkTokensPurchasedEventGroup(await sale.buyTokens({ from: accounts[2], value: cost }), sale.address, accounts[2], cost, tokens, false)
         })

         it("try to purchase tokens during phase 2 (whitelisted for phase 2)", async () => {
            assert.equal(await sale.whitelist.call(accounts[3]), 2)

            var cost = CONTRIBUTION_MIN
            var tokens = Utils.calculateTokensFromWei(TOKENS_PER_KETHER, cost)

            assert.equal(await sale.buyTokens.call({ from: accounts[3], value: cost }), true)
            Utils.checkTokensPurchasedEventGroup(await sale.buyTokens({ from: accounts[3], value: cost }), sale.address, accounts[3], cost, tokens, false)
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

         await sale.setAdminAddress(admin)
         await sale.setOpsAddress(ops)

         // Whitelist accounts for purchase
         await sale.updateWhitelist(accounts[2], 2, { from: ops })
         await sale.updateWhitelist(accounts[3], 2, { from: ops })

         // Sale starts
         await Utils.changeTime(sale, PHASE2_START_TIME + 1)
      })


      it("change wallet to address 0", async () => {
         await Utils.expectThrow(sale.changeWallet.call(0, { from: admin }))
      })

      it("purchase tokens with wallet = account[1]", async () => {
         assert.equal(await sale.wallet.call(), accounts[0])
         assert.equal(await sale.changeWallet.call(accounts[1], { from: admin }), true)
         Utils.checkWalletChangedEventGroup(await sale.changeWallet(accounts[1], { from: admin }), accounts[1])
         assert.equal(await sale.wallet.call(), accounts[1])

         const balanceBefore = await Utils.getBalance(accounts[1])
         await sale.sendTransaction({ from: accounts[2], value: web3.toWei(0.1, "ether") })
         const balanceAfter = await Utils.getBalance(accounts[1])

         assert.isTrue(balanceAfter.gt(balanceBefore), "Expected wallet balance after > before")
      })

      it("purchase tokens with wallet = account[2]", async () => {
         Utils.checkWalletChangedEventGroup(await sale.changeWallet(accounts[2], { from: admin }), accounts[2])

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

         await sale.setAdminAddress(admin)
         await sale.setOpsAddress(ops)
      })


      it("check properties before finalize", async () => {
         assert.equal(await sale.finalized.call(), false)
         assert.equal(await token.finalized.call(), false)
      })

      it("finalize the sale contract", async () => {
         assert.equal(await sale.finalize.call({ from: admin }), true)
         Utils.checkFinalizedEventGroup(await sale.finalize({ from: admin }))
      })

      it("check properties after finalize", async () => {
         assert.equal(await sale.finalized.call(), true)
         assert.equal(await token.finalized.call(), false)
      })

      it("try to finalize a 2nd time", async () => {
         await Utils.expectThrow(sale.finalize.call({ from: admin }))
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

            await sale.setAdminAddress(admin)
            await sale.setOpsAddress(ops)
         })

         it("reclaimTokens before finalize", async () => {
            const balance0Before = await token.balanceOf(accounts[0])
            const balanceSaleBefore = await token.balanceOf(sale.address)

            await Utils.expectThrow(sale.reclaimTokens(balanceSaleBefore, { from: admin }))

            const balance0After = await token.balanceOf(accounts[0])
            const balanceSaleAfter = await token.balanceOf(sale.address)

            assert.equal(balance0After.sub(balance0Before).toNumber(), 0)
            assert.equal(balanceSaleAfter.sub(balanceSaleBefore).toNumber(), 0)
         })
      })


      context('after finalize', async () => {
         before(async () => {
            var contracts = await Utils.deployContracts(artifacts, accounts)

            token   = contracts.token
            trustee = contracts.trustee
            sale    = contracts.sale

            await sale.setAdminAddress(admin)
            await sale.setOpsAddress(ops)
            await token.setAdminAddress(admin)
         })


         it("reclaimTokens after finalize", async () => {
            await sale.finalize({ from: admin })
            await token.finalize({ from: admin })

            const balance0Before = await token.balanceOf(accounts[0])
            const balanceSaleBefore = await token.balanceOf(sale.address)

            assert.equal(await sale.reclaimTokens.call(balanceSaleBefore, { from: admin }), true)
            Utils.checkTokensReclaimedEventGroup(await sale.reclaimTokens(balanceSaleBefore, { from: admin }), balanceSaleBefore)

            const balance0After = await token.balanceOf(accounts[0])
            const balanceSaleAfter = await token.balanceOf(sale.address)

            assert.equal(balance0After.sub(balance0Before).toNumber(), balanceSaleBefore)
            assert.equal(balanceSaleAfter.sub(balanceSaleBefore).toNumber(), balanceSaleBefore.mul(-1))
         })

         it("reclaimTokens with 0 balance", async () => {
            const balanceSaleBefore = await token.balanceOf(sale.address)
            assert.equal(balanceSaleBefore, 0)

            assert.equal(await sale.reclaimTokens.call(balanceSaleBefore, { from: admin }), true)
         })
      })
   })

   describe('burnUnsoldTokens', async () => {

      var token   = null
      var trustee = null
      var sale    = null

      context('before finalize', async () => {
         before(async () => {
            var contracts = await Utils.deployContracts(artifacts, accounts)

            token   = contracts.token
            trustee = contracts.trustee
            sale    = contracts.sale

            await sale.setAdminAddress(admin)
            await sale.setOpsAddress(ops)
         })

         it("burnUnsoldTokens before finalize", async () => {
            const balanceSaleBefore = await token.balanceOf(sale.address)

            await Utils.expectThrow(sale.burnUnsoldTokens({ from: admin }))

            const balanceSaleAfter = await token.balanceOf(sale.address)

            assert.equal(balanceSaleAfter.sub(balanceSaleBefore).toNumber(), 0)
         })
      })


      context('after finalize', async () => {
         before(async () => {
            var contracts = await Utils.deployContracts(artifacts, accounts)

            token   = contracts.token
            trustee = contracts.trustee
            sale    = contracts.sale

            await sale.setAdminAddress(admin)
            await sale.setOpsAddress(ops)
            await token.setAdminAddress(admin)
         })


         it("burnUnsoldTokens after finalize", async () => {
            await sale.finalize({ from: admin })

            const balanceSaleBefore = await token.balanceOf(sale.address)

            assert.equal(await sale.burnUnsoldTokens.call({ from: admin }), true)
            Utils.checkUnsoldTokensBurntEventGroup(await sale.burnUnsoldTokens({ from: admin }), balanceSaleBefore)

            const balanceSaleAfter = await token.balanceOf(sale.address)

            assert.equal(balanceSaleAfter.sub(balanceSaleBefore).toNumber(), balanceSaleBefore.mul(-1))
         })
      })
   })
})

