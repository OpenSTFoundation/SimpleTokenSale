const Utils = require('./lib/utils.js')

var BigNumber = require('bignumber.js')
var Moment = require('moment')

var SimpleToken            = artifacts.require("./SimpleToken.sol")
var Trustee                = artifacts.require("./Trustee.sol")
var TokenSale              = artifacts.require("./TokenSale.sol")
var TokenSaleMock          = artifacts.require("./TokenSaleMock.sol")
var FutureTokenSaleLockBox = artifacts.require("./FutureTokenSaleLockBox.sol")


contract('All Contracts', function(accounts) {

   const DECIMALSFACTOR = new BigNumber('10').pow('18')

   const TOKEN_SYMBOL   = "ST"
   const TOKEN_NAME     = "Simple Token"
   const TOKEN_DECIMALS = 18

   const PHASE1_START_TIME         = 1510664400 // 2017-11-14, 13:00:00 UTC
   const PHASE2_START_TIME         = 1510750800 // 2017-11-15, 13:00:00 UTC
   const END_TIME                  = 1511269199 // 2017-11-21, 12:59:59 UTC
   const CONTRIBUTION_MIN          = web3.toWei(0.1, "ether")
   const CONTRIBUTION_MAX          = web3.toWei("10000", "ether")

   const PHASE1_ACCOUNT_TOKENS_MAX = new BigNumber('18000').mul(DECIMALSFACTOR)

   const TOKENS_MAX                = new BigNumber('800000000').mul(DECIMALSFACTOR)
   const TOKENS_SALE               = new BigNumber('240000000').mul(DECIMALSFACTOR)
   const TOKENS_FOUNDERS           = new BigNumber('80000000').mul(DECIMALSFACTOR)
   const TOKENS_ADVISORS           = new BigNumber('80000000').mul(DECIMALSFACTOR)
   const TOKENS_EARLY_BACKERS      = new BigNumber('44884831').mul(DECIMALSFACTOR)
   const TOKENS_ACCELERATOR        = new BigNumber('217600000').mul(DECIMALSFACTOR)
   const TOKENS_FUTURE             = new BigNumber('137515169').mul(DECIMALSFACTOR)

   const TOKENS_PER_KETHER         = new BigNumber('3600000')


   const deployKey        = accounts[0]
   const admin            = accounts[1]
   const wallet           = accounts[3]
   const whitelistService = accounts[4]
   const revoke           = accounts[5]
   const presale1         = accounts[6]
   const presale2         = accounts[7]

   const allocation1      = accounts[8]
   const allocation2      = accounts[9]

   const accelerator      = accounts[10]

   const tokenOwner       = accounts[11]
   const trusteeOwner     = accounts[12]
   const saleOwner        = accounts[13]
   const lockBoxOwner     = accounts[14]

   const whitelisted1     = accounts[15]
   const whitelisted2     = accounts[16]

   const buyer1           = accounts[17]
   const buyer2           = accounts[18]

   const trusteeAdmin     = accounts[19]

   var token   = null
   var trustee = null
   var sale    = null
   var lockBox = null

   var receipts = []


   function logReceipt(receipt, description) {
      receipts.push({
          receipt     : receipt,
          description : description
      })
   }


   async function logTransaction(hash, description) {
      const receipt = await web3.eth.getTransactionReceipt(hash)
      await logReceipt(receipt, description)
   }


   describe('Initial setup phase', async () => {

      it("Deploy SimpleToken Contract", async () => {
         token = await SimpleToken.new({ from: deployKey, gas: 3500000 })
         await logTransaction(token.transactionHash, "SimpleToken.new")

         // At this point TOKENS_MAX should be assigned to the deployKey
         assert.equal((await token.balanceOf(deployKey)).toNumber(), TOKENS_MAX.toNumber())
      })

      it("Deploy Trustee Contract", async () => {
         trustee = await Trustee.new(token.address, { from: deployKey, gas: 3500000 })
         await logTransaction(trustee.transactionHash, "Trustee.new")
      })

      it("Deploy TokenSale Contract", async () => {
         const newTime = new BigNumber(PHASE1_START_TIME).sub(1000000)

         sale = await TokenSaleMock.new(token.address, trustee.address, wallet, newTime, { from: deployKey, gas: 4500000 })
         await logTransaction(sale.transactionHash, "TokenSale.new")
      })

      it("Deploy LockBox Contract", async () => {
         lockBox = await FutureTokenSaleLockBox.new(token.address, sale.address, { from: deployKey })
         await logTransaction(lockBox.transactionHash, "FutureTokenSaleLockBox.new")
      })

      it("Set the admin keys", async () => {
         const o = await token.setAdminAddress(admin, { from: deployKey })
         await trustee.setAdminAddress(admin, { from: deployKey })
         await sale.setAdminAddress(admin, { from: deployKey })
         logReceipt(o.receipt, "OpsManaged.setAdminAddress")
      })

      it("Set the ops keys", async () => {
         const o = await token.setOpsAddress(sale.address, { from: deployKey })
         await trustee.setOpsAddress(sale.address, { from: deployKey })
         await sale.setOpsAddress(whitelistService, { from: deployKey })
         logReceipt(o.receipt, "OpsManaged.setOpsAddress")
      })

      it("Set the trustee's revoke key", async () => {
         const o = await trustee.setRevokeAddress(revoke, { from: deployKey })
         logReceipt(o.receipt, "Trustee.setRevokeAddress")
      })

      it("Transfer tokens to the sale contract", async () => {
         const o = await token.transfer(sale.address, TOKENS_SALE, { from: deployKey })
         logReceipt(o.receipt, "Token.transfer")
      })

      it("Transfer tokens to the trustee contract", async () => {
         var tokensToTransfer = TOKENS_MAX.sub(TOKENS_SALE).sub(TOKENS_FUTURE)

         assert.equal(await token.transfer.call(trustee.address, tokensToTransfer, { from: deployKey }), true)
         await token.transfer(trustee.address, tokensToTransfer, { from: deployKey })
      })

      it("Call TokenSale.initialize", async () => {
         const o = await sale.initialize({ from: deployKey })
         logReceipt(o.receipt, "TokenSale.initialize")
      })
   })


   describe('Presale and allocations phase', async () => {

      it("Add Presale 1 - 1000, 0", async () => {
         const o = await sale.addPresale(presale1, new BigNumber(1000).mul(DECIMALSFACTOR), 0, { from: admin })
         logReceipt(o.receipt, "TokenSale.addPresale")
      })

      it("Add Presale 2 - 1000, 500", async () => {
         await sale.addPresale(presale2, new BigNumber(1000).mul(DECIMALSFACTOR), new BigNumber(500).mul(DECIMALSFACTOR), { from: admin })
      })

      it("Grant Allocation 1 - 1000", async () => {
         const o = await trustee.grantAllocation(allocation1, new BigNumber(1000).mul(DECIMALSFACTOR), false, { from: admin })
         logReceipt(o.receipt, "Trustee.grantAllocation")
      })

      it("Grant Allocation 2 - 750", async () => {
         await trustee.grantAllocation(allocation2, new BigNumber(750).mul(DECIMALSFACTOR), true, { from: admin })
      })

      it("Reclaim trustee tokens", async () => {
         const o = await trustee.reclaimTokens({ from: admin })
         logReceipt(o.receipt, "Trustee.reclaimTokens")
      })

      it("Transfer future sale tokens to lock box ", async () => {
         const totalPresaleBonus = await sale.totalPresaleBonus.call()

         const futureTokens = TOKENS_FUTURE.sub(totalPresaleBonus)

         await token.transfer(lockBox.address, futureTokens, { from: deployKey })
      })

      it("Transfer remaining tokens to accelerator wallet(s)", async () => {
         const tokensLeft = await token.balanceOf.call(deployKey)

         await token.transfer(accelerator, tokensLeft, { from: deployKey })
      })

      it("Transfer ownership of trustee contract", async () => {
         const o1 = await trustee.initiateOwnershipTransfer(trusteeOwner, { from: deployKey })
         const o2 = await trustee.completeOwnershipTransfer({ from: trusteeOwner })
         logReceipt(o1.receipt, "Owned.initiateOwnershipTransfer")
         logReceipt(o2.receipt, "Owned.completeOwnershipTransfer")
      })

      it("Transfer ownership of sale contract", async () => {
         await sale.initiateOwnershipTransfer(saleOwner, { from: deployKey })
         await sale.completeOwnershipTransfer({ from: saleOwner })
      })

      it("Transfer ownership of lock box contract", async () => {
         await lockBox.initiateOwnershipTransfer(lockBoxOwner, { from: deployKey })
         await lockBox.completeOwnershipTransfer({ from: lockBoxOwner })
      })
   })


   describe('Whitelisting phase', async () => {

      it("Add person 1 to phase 1 whitelist", async () => {
         const o = await sale.updateWhitelist(whitelisted1, 1, { from: whitelistService })
         logReceipt(o.receipt, "TokenSale.updateWhitelist")
      })

      it("Add person 2 to phase 2 whitelist", async () => {
         await sale.updateWhitelist(whitelisted2, 2, { from: whitelistService })
      })
   })


   describe('Before sale phase', async () => {

      it("Set price for tokens", async () => {
         // Here we use a price of ~240M tokens / Ether to make it easier to test boundaries.
         const price = new BigNumber("240000000").mul(1000)
         const o = await sale.setTokensPerKEther(price, { from: admin })
         logReceipt(o.receipt, "TokenSale.setTokensPerKEther")
      })

      it("Set max tokens for phase 1", async () => {
         await sale.setPhase1AccountTokensMax(new BigNumber("200000000").mul(DECIMALSFACTOR), { from: admin })
      })
   })


   describe('During sale phase', async () => {

      it("whitelisted 1 buys during phase 1", async () => {
         await sale.changeTime(PHASE1_START_TIME, { from: saleOwner })

         const o = web3.eth.sendTransaction({ from: whitelisted1, to: sale.address, value: web3.toWei(0.5, 'ether') })
         await logTransaction(o, "sendTransaction (buy tokens)")
      })

      it("whitelisted 2 buys during phase 2", async () => {
         await sale.changeTime(PHASE2_START_TIME, { from: saleOwner })

         web3.eth.sendTransaction({ from: whitelisted2, to: sale.address, value: web3.toWei(1, 'ether') })
      })
   })


   describe('Sale finalization phase', async () => {

      it("Check that the sale has been auto-finalized (since all tokens were purchased.", async () => {
         assert.equal(await sale.finalized.call(), true)
      })

      it("finalize the token", async () => {
         const o = await token.finalize({ from: admin })
         logReceipt(o.receipt, "Token.finalize")
      })

      it("reclaim the tokens", async () => {
         const saleTokenBalance = await token.balanceOf(sale.address)
         assert.equal(saleTokenBalance, 0)

         const ownerBalanceBefore = await token.balanceOf(saleOwner)
         const o = await sale.reclaimTokens(ownerBalanceBefore, { from: admin })
         logReceipt(o.receipt, "TokenSale.reclaimTokens")

         const ownerBalanceAfter = await token.balanceOf(saleOwner)
         assert.equal(ownerBalanceAfter.sub(ownerBalanceBefore).toNumber(), 0)
      })

      // NOTE: Ordering is different from spec document. We have to finalize the token before this transfer.
      it("token sale contract owner transfers tokens to lock box for future sales", async () => {
         const ownerTokens = await token.balanceOf(saleOwner)

         await token.transfer(lockBox.address, ownerTokens, { from: saleOwner })
      })

      it("zero out the token contract ops and admin addresses", async () => {
          await token.setOpsAddress(0, { from: admin })
          await token.setAdminAddress(0, { from: admin })
      })

      it("zero out the sale contract ops and admin addresses", async () => {
          await sale.setOpsAddress(0, { from: admin })
          await sale.setAdminAddress(0, { from: admin })
      })

      it("change the trustee contract ops and admin addresses", async () => {
          await trustee.setOpsAddress(0, { from: admin })
          await trustee.setAdminAddress(trusteeAdmin, { from: admin })
      })
   })

   describe('Statistics', async () => {

      it("gasUsed", async () => {
         var totalGasUsed = 0

         for (i = 0; i < receipts.length; i++) {
            const entry = receipts[i]

            totalGasUsed += entry.receipt.gasUsed

            console.log("      " + entry.description.padEnd(32) + entry.receipt.gasUsed)
         }

         console.log("      ------------------------------------------")
         console.log("      " + "Total gas logged: ".padEnd(32) + totalGasUsed)
      })
   })
})
