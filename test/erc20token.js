const Utils = require('./lib/utils.js')

const Moment = require('moment')
const BigNumber = require('bignumber.js')

const ERC20Token = artifacts.require("./ERC20Token.sol")


//
// Basic properties
//    name
//    symbol
//    decimals
//    totalSupply
//    balances is private
//    Constructor raised transfer event
//    owner is as expected
//
// transfer
//    transfer 0 tokens (fails)
//    transfer > balance (fails)
//    transfer = balance (ok)
//    transfer 1 token (ok)
//    transfer 10000 tokens (ok)
//
// transferFrom
//    transfer    0  from account 0 -> 1 with 0 allowance (fails)
//    transfer 1000  from account 0 -> 1 without allowance (fails)
//    transfer 1000  from account 0 -> 1 with 10 allowance (fails)
//    transfer 1000  from account 0 -> 1 with 1000 allowance (ok)
//    transfer 50+50 from account 0 -> 1 with 100 allowance (ok)
//    transfer 1000  from account 0 -> 1 with 999 allowance (fails)
//    transfer    1  from account 0 -> 1 with 0 allowance (fails)
//
// approve
// balanceOf
// allowance
//    * covered indirectly by testing the other functions
//
// balances
//    check if balances is exposed publicly
//
// events
//    Transfer
//    Approval
//       * covered indirectly by testing other functions
//

contract('ERC20Token', (accounts) => {

   const DECIMALSFACTOR = new BigNumber('10').pow('18')

   const SYMBOL         = "ST"
   const NAME           = "Simple Token"
   const DECIMALS       = 18
   const TOTAL_SUPPLY   = new BigNumber('800000000').mul(DECIMALSFACTOR)


   async function createToken() {
      return await ERC20Token.new(SYMBOL, NAME, DECIMALS, TOTAL_SUPPLY, { from: accounts[0], gas: 3500000 })
   }


   describe('Basic properties', async () => {

      var token = null

      before(async () => {
         token = await createToken()
      })


      it("name", async () => {
         assert.equal(await token.name.call(), NAME)
      })

      it("symbol", async () => {
         assert.equal(await token.symbol.call(), SYMBOL)
      })

      it("decimals", async () => {
         assert.equal(await token.decimals.call(), DECIMALS)
      })

      it("totalSupply", async () => {
         assert.equal((await token.totalSupply.call()).toNumber(), TOTAL_SUPPLY.toNumber())
      })

      it("balances is private", async () => {
         assert.isTrue(typeof(token.balances) == 'undefined')
      })

      it('Constructor raised transfer event', async () => {
          const receipt = await web3.eth.getTransactionReceipt(token.transactionHash)
          assert.equal(receipt.logs.length, 1)
          const logs = Utils.decodeLogs(token.abi, [ receipt.logs[0] ])
          Utils.checkTransferEvent(logs[0], 0, accounts[0], TOTAL_SUPPLY)
      })

      it("owner", async () => {
         assert.equal(await token.owner.call(), accounts[0])
      })
   })


   describe('transfer function', async () => {

      var token = null

      before(async () => {
         token = await createToken()
      })


      it("transfer 0 tokens", async () => {
         assert.equal(await token.transfer.call(accounts[1], 0), true)
         Utils.checkTransferEventGroup(await token.transfer(accounts[1], 0), accounts[0], accounts[1], 0)
      })

      it("transfer > balance", async () => {
         const balance = await token.balanceOf.call(accounts[0])
         await Utils.expectThrow(token.transfer.call(accounts[1], balance.add(1)), false)
      })

      it("transfer = balance", async () => {
         const balance = await token.balanceOf.call(accounts[0])
         assert.equal(await token.transfer.call(accounts[1], balance), true)
         Utils.checkTransferEventGroup(await token.transfer(accounts[1], balance), accounts[0], accounts[1], balance)
         assert.equal((await token.balanceOf(accounts[0])).toNumber(), 0)
         assert.equal((await token.balanceOf(accounts[1])).toNumber(), balance)
      })

      it("transfer 1 token", async () => {
         const balance = await token.balanceOf.call(accounts[1])
         assert.equal(await token.transfer.call(accounts[0], 1, { from: accounts[1] }), true)
         Utils.checkTransferEventGroup(await token.transfer(accounts[0], 1, { from: accounts[1] }), accounts[1], accounts[0], 1)
         assert.equal((await token.balanceOf(accounts[0])).toNumber(), 1)
         assert.equal((await token.balanceOf(accounts[1])).toNumber(), balance.sub(1).toNumber())
      })

      it("transfer 10000 token", async () => {
         const balance = await token.balanceOf.call(accounts[1])
         assert.equal(await token.transfer.call(accounts[0], 10000, { from: accounts[1] }), true)
         Utils.checkTransferEventGroup(await token.transfer(accounts[0], 10000, { from: accounts[1] }), accounts[1], accounts[0], 10000)
         assert.equal((await token.balanceOf(accounts[0])).toNumber(), 10001)
         assert.equal((await token.balanceOf(accounts[1])).toNumber(), balance.sub(10000).toNumber())
      })
   })


   describe('transferFrom function', async () => {

      var token = null

      before(async () => {
         token = await createToken()
      })


      it("transfer 0 from account 0 -> 1 with 0 allowance", async () => {
         assert.equal(await token.approve.call(accounts[1], 0), true)
         assert.equal(await token.allowance.call(accounts[0], accounts[1]), 0)
         assert.equal(await token.transferFrom.call(accounts[0], accounts[1], 0, { from: accounts[1] }), true)
      })

      it("transfer 1000 from account 0 -> 1 with 0 allowance", async () => {
         await Utils.expectThrow(token.transferFrom.call(accounts[0], accounts[1], 1000))

         await Utils.expectThrow(token.transferFrom.call(accounts[0], accounts[1], 1000, { from: accounts[1] }))
      })

      it("transfer 1000 from account 0 -> 1 with 10 allowance", async () => {
         assert.equal(await token.approve.call(accounts[1], 10), true)
         Utils.checkApprovalEventGroup(await token.approve(accounts[1], 10), accounts[0], accounts[1], 10)

         assert.equal(await token.allowance.call(accounts[0], accounts[1]), 10)

         await Utils.expectThrow(token.transferFrom.call(accounts[0], accounts[1], 1000))

         await Utils.expectThrow(token.transferFrom.call(accounts[0], accounts[1], 1000, { from: accounts[1] }))
      })

      it("transfer 1000 from account 0 -> 1 with 1000 allowance", async () => {
         const balance0Before = await token.balanceOf.call(accounts[0])
         const balance1Before = await token.balanceOf.call(accounts[1])

         // We first need to bring approval to 0
         assert.equal(await token.approve.call(accounts[1], 0), true)
         Utils.checkApprovalEventGroup(await token.approve(accounts[1], 0), accounts[0], accounts[1], 0)

         assert.equal(await token.allowance.call(accounts[0], accounts[1]), 0)
         assert.equal(await token.approve.call(accounts[1], 1000), true)
         Utils.checkApprovalEventGroup(await token.approve(accounts[1], 1000), accounts[0], accounts[1], 1000)

         assert.equal(await token.allowance.call(accounts[0], accounts[1]), 1000)

         await Utils.expectThrow(token.transferFrom.call(accounts[0], accounts[1], 1000))

         assert.equal(await token.transferFrom.call(accounts[0], accounts[1], 1000, { from: accounts[1] }), true)
         Utils.checkTransferEventGroup(await token.transferFrom(accounts[0], accounts[1], 1000, { from: accounts[1] }), accounts[0], accounts[1], 1000)

         const balance0After = await token.balanceOf.call(accounts[0])
         const balance1After = await token.balanceOf.call(accounts[1])

         assert.equal(balance0After.sub(balance0Before).toNumber(), -1000)
         assert.equal(balance1After.sub(balance1Before).toNumber(), 1000)
      })
   })
})
