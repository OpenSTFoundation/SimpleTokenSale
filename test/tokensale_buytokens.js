const Utils = require('./lib/utils.js')

var BigNumber = require('bignumber.js')
var Moment = require('moment')

var SimpleToken = artifacts.require("./SimpleToken.sol")
var Trustee     = artifacts.require("./Trustee.sol")
var TokenSale   = artifacts.require("./TokenSale.sol")


//
// before Phase 1
//    call buyTokens as owner
//    call buyTokens as whitelisted account
//
// during Phase 1
//    buy tokens as normal account
//    buy tokens with 0 amount
//    buy tokens as owner
//    buy tokens as whitelisted account
//    buy tokens to purchase maximum possible
//    buy CONTRIBUTION_MIN ETH more tokens
//
// during Phase 2
//    buy tokens as normal account
//    buy tokens with 0 amount
//    buy tokens as owner
//    buy tokens as whitelisted account
//    buy tokens with < CONTRIBUTION_MIN
//    buy all tokens left for sale
//
// after Phase 2 - ended by sold out
//    buy CONTRIBUTION_MIN more tokens
//
// after Phase 2 - ended by time
//    buy CONTRIBUTION_MIN more tokens
//
// after Phase 2 - ended by finalize
//    buy CONTRIBUTION_MIN more tokens
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
   const CONTRIBUTION_MAX          = new BigNumber(web3.toWei("1000000", "ether"))

   const PHASE1_ACCOUNT_TOKENS_MAX = new BigNumber("36000").mul(DECIMALSFACTOR)

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


   describe('buyTokens function', async () => {

      var contracts = null
      var token     = null
      var trustee   = null
      var sale      = null

      before(async () => {
         contracts = await Utils.deployContracts(artifacts, accounts)

         token     = contracts.token
         trustee   = contracts.trustee
         sale      = contracts.sale

         await sale.setAdminAddress(admin)
         await sale.setOpsAddress(ops)
      })


      context('before Phase 1', async () => {

         it("call buyTokens as owner", async () => {
            await Utils.expectThrow(sale.buyTokens.call({ from: accounts[0], value: CONTRIBUTION_MIN }))
         })

         it("call buyTokens as whitelisted account", async () => {
            await sale.updateWhitelist(accounts[1], 1, { from: ops })
            await Utils.expectThrow(sale.buyTokens.call({ from: accounts[1], value: CONTRIBUTION_MIN }))
         })
      })


      context('during Phase 1', async () => {

         var wallet = null

         before(async() => {
            await sale.setTokensPerKEther(TOKENS_PER_KETHER, { from: admin })
            await Utils.changeTime(sale, PHASE1_START_TIME + 1)

            wallet = await sale.wallet.call()
         })


         it("buy tokens as normal account", async () => {
            await Utils.expectThrow(sale.buyTokens.call({ from: accounts[2], value: CONTRIBUTION_MIN }))
         })

         it("buy tokens with 0 amount", async () => {
            await Utils.expectThrow(sale.buyTokens.call({ from: accounts[1], value: 0 }))
         })

         it("buy tokens as owner", async () => {
            await Utils.expectThrow(sale.buyTokens.call({ from: accounts[0], value: CONTRIBUTION_MIN }))
         })

         it("buy tokens as whitelisted account for phase 1", async () => {
            await sale.updateWhitelist(accounts[1], 1, { from: ops })

            var cost = CONTRIBUTION_MIN
            var tokens = Utils.calculateTokensFromWei(TOKENS_PER_KETHER, cost)

            const tokenBalance1Before      = await token.balanceOf(accounts[1])
            const ethBalance1Before        = await Utils.getBalance(accounts[1])
            const tokenBalanceSaleBefore   = await token.balanceOf(sale.address)
            const ethBalanceSaleBefore     = await Utils.getBalance(sale.address)
            const tokenBalanceWalletBefore = await token.balanceOf(wallet)
            const ethBalanceWalletBefore   = await Utils.getBalance(wallet)

            assert.equal(await sale.buyTokens.call({ from: accounts[1], value: cost }), true)
            const result = await sale.buyTokens({ from: accounts[1], value: cost })
            Utils.checkTokensPurchasedEventGroup(result, sale.address, accounts[1], cost, tokens, false)

            const tokenBalance1After       = await token.balanceOf(accounts[1])
            const ethBalance1After         = await Utils.getBalance(accounts[1])
            const tokenBalanceSaleAfter    = await token.balanceOf(sale.address)
            const ethBalanceSaleAfter      = await Utils.getBalance(sale.address)
            const tokenBalanceWalletAfter  = await token.balanceOf(wallet)
            const ethBalanceWalletAfter    = await Utils.getBalance(wallet)

            assert.equal(tokenBalance1After.sub(tokenBalance1Before).toNumber(), tokens.toNumber())
            //assert.equal(ethBalance1After.sub(ethBalance1Before).toNumber(), cost.mul(-1).toNumber())
            assert.equal(tokenBalanceSaleAfter.sub(tokenBalanceSaleBefore).toNumber(), tokens.mul(-1).toNumber())
            assert.equal(ethBalanceSaleAfter.sub(ethBalanceSaleBefore).toNumber(), 0)
            assert.equal(tokenBalanceWalletAfter.sub(tokenBalanceWalletBefore).toNumber(), 0)
            assert.equal(ethBalanceWalletAfter.sub(ethBalanceWalletBefore).toNumber(), cost.toNumber())
         })

         it("buy tokens to purchase 1 less than maximum possible", async () => {
            const tokenBalance1Before      = await token.balanceOf(accounts[1])
            const tokenBalanceSaleBefore   = await token.balanceOf(sale.address)
            const ethBalanceSaleBefore     = await Utils.getBalance(sale.address)
            const tokenBalanceWalletBefore = await token.balanceOf(wallet)
            const ethBalanceWalletBefore   = await Utils.getBalance(wallet)

            const tokens = PHASE1_ACCOUNT_TOKENS_MAX.sub(tokenBalance1Before).sub(1)
            const cost = Utils.calculateCostFromTokens(TOKENS_PER_KETHER, tokens).trunc()

            assert.equal(await sale.buyTokens.call({ from: accounts[1], value: cost }), true)
            Utils.checkTokensPurchasedEventGroup(await sale.buyTokens({ from: accounts[1], value: cost }), sale.address, accounts[1], cost, tokens, false)

            const tokenBalance1After       = await token.balanceOf(accounts[1])
            const ethBalance1After         = await Utils.getBalance(accounts[1])
            const tokenBalanceSaleAfter    = await token.balanceOf(sale.address)
            const ethBalanceSaleAfter      = await Utils.getBalance(sale.address)
            const tokenBalanceWalletAfter  = await token.balanceOf(wallet)
            const ethBalanceWalletAfter    = await Utils.getBalance(wallet)

            assert.equal(tokenBalance1After.sub(tokenBalance1Before).toNumber(), tokens.toNumber())
            assert.equal(tokenBalanceSaleAfter.sub(tokenBalanceSaleBefore).toNumber(), tokens.mul(-1).toNumber())
            assert.equal(ethBalanceSaleAfter.sub(ethBalanceSaleBefore).toNumber(), 0)
            assert.equal(tokenBalanceWalletAfter.sub(tokenBalanceWalletBefore).toNumber(), 0)
            assert.equal(ethBalanceWalletAfter.sub(ethBalanceWalletBefore).toNumber(), cost.toNumber())
         })

         it("buy leftover tokens", async () => {
            const tokenBalance1Before      = await token.balanceOf(accounts[1])
            const tokenBalanceSaleBefore   = await token.balanceOf(sale.address)
            const ethBalanceSaleBefore     = await Utils.getBalance(sale.address)
            const tokenBalanceWalletBefore = await token.balanceOf(wallet)
            const ethBalanceWalletBefore   = await Utils.getBalance(wallet)

            const tokens = PHASE1_ACCOUNT_TOKENS_MAX.sub(tokenBalance1Before)
            const cost = Utils.calculateCostFromTokens(TOKENS_PER_KETHER, tokens).trunc()

            assert.isTrue(cost.lt(CONTRIBUTION_MIN.toNumber()), "Expected cost to be less than min contribution")
            assert.equal(await sale.buyTokens.call({ from: accounts[1], value: CONTRIBUTION_MIN}), true)
            Utils.checkTokensPurchasedEventGroup(await sale.buyTokens({ from: accounts[1], value: CONTRIBUTION_MIN }), sale.address, accounts[1], cost, tokens, false)

            const tokenBalance1After       = await token.balanceOf(accounts[1])
            const ethBalance1After         = await Utils.getBalance(accounts[1])
            const tokenBalanceSaleAfter    = await token.balanceOf(sale.address)
            const ethBalanceSaleAfter      = await Utils.getBalance(sale.address)
            const tokenBalanceWalletAfter  = await token.balanceOf(wallet)
            const ethBalanceWalletAfter    = await Utils.getBalance(wallet)

            assert.equal(tokenBalance1After.sub(tokenBalance1Before).toNumber(), tokens.toNumber())
            assert.equal(tokenBalance1After.toNumber(), PHASE1_ACCOUNT_TOKENS_MAX.toNumber())
            assert.equal(tokenBalanceSaleAfter.sub(tokenBalanceSaleBefore).toNumber(), tokens.mul(-1).toNumber())
            assert.equal(ethBalanceSaleAfter.sub(ethBalanceSaleBefore).toNumber(), 0)
            assert.equal(tokenBalanceWalletAfter.sub(tokenBalanceWalletBefore).toNumber(), 0)
            assert.equal(ethBalanceWalletAfter.sub(ethBalanceWalletBefore).toNumber(), cost.toNumber())
         })

         it("buy CONTRIBUTION_MIN ETH more tokens", async () => {
            await Utils.expectThrow(sale.buyTokens.call({ from: accounts[1], value: CONTRIBUTION_MIN }))
         })

         it("enter phase 1 with only 1 token left", async () => {
            contracts = await Utils.deployContracts(artifacts, accounts)

            token     = contracts.token
            trustee   = contracts.trustee
            sale      = contracts.sale

            await sale.setAdminAddress(admin)
            await sale.setOpsAddress(ops)

            await sale.updateWhitelist(accounts[1], 1, { from: ops })


            const tokenBalance1Before      = await token.balanceOf(accounts[1])
            var   tokenBalanceSaleBefore   = await token.balanceOf(sale.address)
            const ethBalanceSaleBefore     = await Utils.getBalance(sale.address)
            const tokenBalanceWalletBefore = await token.balanceOf(wallet)

            await sale.addPresale(accounts[1], tokenBalanceSaleBefore.sub(1), 0, { from: admin })

            await Utils.changeTime(sale, PHASE1_START_TIME + 1)

            tokenBalanceSaleBefore         = await token.balanceOf(sale.address)

            const ethBalanceWalletBefore   = await Utils.getBalance(wallet)
            const tokens = tokenBalanceSaleBefore
            const cost = Utils.calculateCostFromTokens(TOKENS_PER_KETHER, tokens).trunc()

            assert.isTrue(cost.lt(CONTRIBUTION_MIN.toNumber()), "Expected cost to be less than min contribution")
            assert.equal(await sale.buyTokens.call({ from: accounts[1], value: CONTRIBUTION_MIN}), true)
            Utils.checkTokensPurchasedEventGroup(await sale.buyTokens({ from: accounts[1], value: CONTRIBUTION_MIN }), sale.address, accounts[1], cost, tokens, true)

            const tokenBalance1After       = await token.balanceOf(accounts[1])
            const ethBalance1After         = await Utils.getBalance(accounts[1])
            const tokenBalanceSaleAfter    = await token.balanceOf(sale.address)
            const ethBalanceSaleAfter      = await Utils.getBalance(sale.address)
            const tokenBalanceWalletAfter  = await token.balanceOf(wallet)
            const ethBalanceWalletAfter    = await Utils.getBalance(wallet)

            assert.equal(tokenBalance1After.sub(tokenBalance1Before).toNumber(), tokens.toNumber())
            assert.equal(tokenBalance1After.toNumber(), 1)
            assert.equal(tokenBalanceSaleAfter.sub(tokenBalanceSaleBefore).toNumber(), tokens.mul(-1).toNumber())
            assert.equal(tokenBalanceSaleAfter.toNumber(), 0)
            assert.equal(ethBalanceSaleAfter.sub(ethBalanceSaleBefore).toNumber(), 0)
            assert.equal(tokenBalanceWalletAfter.sub(tokenBalanceWalletBefore).toNumber(), 0)
            assert.equal(ethBalanceWalletAfter.sub(ethBalanceWalletBefore).toNumber(), cost.toNumber())
         })
      })


      context('during Phase 2', async () => {

         var wallet = null

         before(async() => {
            contracts = await Utils.deployContracts(artifacts, accounts)

            token     = contracts.token
            trustee   = contracts.trustee
            sale      = contracts.sale

            await sale.setAdminAddress(admin)
            await sale.setOpsAddress(ops)

            wallet    = await sale.wallet.call()

            const tokens = await token.balanceOf(sale.address)
            await sale.setTokensPerKEther(tokens, { from: admin })

            await Utils.changeTime(sale, PHASE2_START_TIME + 1)
         })


         it("buy tokens as normal account", async () => {
            await Utils.expectThrow(sale.buyTokens.call({ from: accounts[2], value: CONTRIBUTION_MIN }))
         })

         it("buy tokens with 0 amount", async () => {
            await Utils.expectThrow(sale.buyTokens.call({ from: accounts[1], value: 0 }))
         })

         it("buy tokens as owner", async () => {
            await Utils.expectThrow(sale.buyTokens.call({ from: accounts[0], value: CONTRIBUTION_MIN }))
         })

         it("buy tokens as whitelisted account", async () => {
            await sale.updateWhitelist(accounts[5], 2, { from: ops })
            assert.equal(await sale.buyTokens.call({ from: accounts[5], value: CONTRIBUTION_MIN }), true)
            await sale.buyTokens.call({ from: accounts[5], value: CONTRIBUTION_MIN })
         })

         it("buy tokens with < CONTRIBUTION_MIN", async () => {
            await Utils.expectThrow(sale.buyTokens.call({ from: accounts[1], value: CONTRIBUTION_MIN.sub(1) }))
         })

         it("buy all tokens left for sale", async () => {
            await sale.updateWhitelist(accounts[1], 1, { from: ops })

            const totalTokensSoldBefore = await sale.totalTokensSold.call()
            const tokens = TOKENS_SALE.sub(totalTokensSoldBefore)
            const tokensPerKEther = await sale.tokensPerKEther.call()
            const cost = Utils.calculateCostFromTokens(tokensPerKEther, tokens).trunc()
            const contribution = cost.add(new BigNumber(web3.toWei(1, "ether")))
            const tokenBalance1Before      = await token.balanceOf(accounts[1])
            const ethBalance1Before        = await Utils.getBalance(accounts[1])
            const tokenBalanceSaleBefore   = await token.balanceOf(sale.address)
            const ethBalanceSaleBefore     = await Utils.getBalance(sale.address)
            const tokenBalanceWalletBefore = await token.balanceOf(wallet)
            const ethBalanceWalletBefore   = await Utils.getBalance(wallet)

            assert.isTrue(contribution.lt(CONTRIBUTION_MAX), "contribution exceeds CONTRIBUTION_MAX")
            assert.isTrue(cost.toNumber() > 0, "cost should be > 0")
            assert.isTrue(ethBalance1Before.gt(contribution), "not enough balance in account to buy all tokens")

            assert.equal(await sale.buyTokens.call({ from: accounts[1], value: contribution }), true)
            const result = await sale.buyTokens({ from: accounts[1], value: contribution })
            Utils.checkTokensPurchasedEventGroup(result, sale.address, accounts[1], cost, tokens, true)

            const tokenBalance1After       = await token.balanceOf(accounts[1])
            const ethBalance1After         = await Utils.getBalance(accounts[1])
            const tokenBalanceSaleAfter    = await token.balanceOf(sale.address)
            const ethBalanceSaleAfter      = await Utils.getBalance(sale.address)
            const tokenBalanceWalletAfter  = await token.balanceOf(wallet)
            const ethBalanceWalletAfter    = await Utils.getBalance(wallet)

            assert.equal(tokenBalance1After.sub(tokenBalance1Before).toNumber(), tokens.toNumber())
            assert.equal(tokenBalanceSaleAfter.sub(tokenBalanceSaleBefore).toNumber(), tokens.mul(-1).toNumber())
            assert.equal(ethBalanceSaleAfter.sub(ethBalanceSaleBefore).toNumber(), 0)
            assert.equal(tokenBalanceWalletAfter.sub(tokenBalanceWalletBefore).toNumber(), 0)
            assert.equal(ethBalanceWalletAfter.sub(ethBalanceWalletBefore).toNumber(), cost.toNumber())
         })
      })


      context('after Phase 2 - ended by sold out', async () => {

         it("buy CONTRIBUTION_MIN more tokens", async () => {
            var totalTokensSold = await sale.totalTokensSold.call()
            var tokensToBuy = TOKENS_SALE.sub(totalTokensSold)
            var cost = Utils.calculateCostFromTokens(TOKENS_PER_KETHER, tokensToBuy).trunc()
            var balance = await Utils.getBalance(accounts[1])

            assert.equal(tokensToBuy.toNumber(), 0)

            await Utils.expectThrow(sale.buyTokens.call({ from: accounts[1], value: CONTRIBUTION_MIN }))
         })
      })


      context('after Phase 2 - ended by time', async () => {

         before(async() => {

            contracts = await Utils.deployContracts(artifacts, accounts)

            token   = contracts.token
            trustee = contracts.trustee
            sale    = contracts.sale

            await sale.setAdminAddress(admin)
            await sale.setOpsAddress(ops)

            await Utils.changeTime(sale, END_TIME + 1)
         })

         it("buy CONTRIBUTION_MIN more tokens", async () => {
            await Utils.expectThrow(sale.buyTokens.call({ from: accounts[1], value: CONTRIBUTION_MIN }))
         })
      })


      context('after Phase 2 - ended by finalize', async () => {

         before(async() => {

            contracts = await Utils.deployContracts(artifacts, accounts)

            token   = contracts.token
            trustee = contracts.trustee
            sale    = contracts.sale

            await sale.setAdminAddress(admin)
            await sale.setOpsAddress(ops)

            await Utils.changeTime(sale, PHASE1_START_TIME + 1)
            await sale.finalize({ from: admin })
         })

         it("buy CONTRIBUTION_MIN more tokens", async () => {
            await Utils.expectThrow(sale.buyTokens.call({ from: accounts[1], value: CONTRIBUTION_MIN }))
         })
      })
   })
})

