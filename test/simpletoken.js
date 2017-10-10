const Utils = require('./lib/utils.js')

const Moment = require('moment')
const BigNumber = require('bignumber.js')

const SimpleToken = artifacts.require("./SimpleToken.sol")


//
// Basic properties
//    name
//    symbol
//    decimals
//    totalSupply
//
// transfer before finalize
//    transfer from owner to other
//    transfer 0 tokens (fails)
//    transfer > balance (fails)
//    transfer = balance (ok)
//    transfer 1 token (ok)
//    transfer 10000 tokens (ok)
//
// transfer after finalize
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
// transferFrom after finalize
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
// owner and operations
//    - set operations key
//    - finalize (owner + ops)
//
// finalize
//    - check properties before and after finalize
//    - try to finalize a 2nd time
//    * other cases covered indirectly by testing other functions
//

contract('SimpleToken', (accounts) => {

   const DECIMALSFACTOR = new BigNumber('10').pow('18')

   const SYMBOL         = "ST"
   const NAME           = "Simple Token"
   const DECIMALS       = 18
   const TOTAL_SUPPLY   = new BigNumber('800000000').mul(DECIMALSFACTOR)

   async function createToken() {
      return await SimpleToken.new()
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
   })


   describe('transfer function before finalize', async () => {

      var token = null

      before(async () => {
         token = await createToken()
      })

      it("transfer tokens from owner to other", async () => {
         const balance0Before = await token.balanceOf(accounts[0])
         const balance1Before = await token.balanceOf(accounts[1])

         Utils.checkTransferEventGroup(await token.transfer(accounts[1], 1000), accounts[0], accounts[1], 1000)

         const balance0After = await token.balanceOf(accounts[0])
         const balance1After = await token.balanceOf(accounts[1])

         assert.equal(balance0After.sub(balance0Before).toNumber(), -1000)
         assert.equal(balance1After.sub(balance1Before).toNumber(), 1000)
      })

      it("transfer 0 tokens", async () => {
         await Utils.expectThrow(token.transfer.call(accounts[2], 0, { from: accounts[1] }))
      })

      it("transfer > balance", async () => {
         const balance = await token.balanceOf.call(accounts[1])
         await Utils.expectThrow(token.transfer.call(accounts[2], balance.add(1), { from: accounts[1] }))
      })

      it("transfer = balance", async () => {
         const balance = await token.balanceOf.call(accounts[1])

         await Utils.expectThrow(token.transfer.call(accounts[2], balance, { from: accounts[1] }))

         assert.equal((await token.balanceOf(accounts[1])).toNumber(), balance.toNumber())
         assert.equal((await token.balanceOf(accounts[2])).toNumber(), 0)
      })

      it("transfer 1 token", async () => {
         const balance = await token.balanceOf.call(accounts[1])
         await Utils.expectThrow(token.transfer.call(accounts[2], 1, { from: accounts[1] }))
         assert.equal((await token.balanceOf(accounts[2])).toNumber(), 0)
         assert.equal((await token.balanceOf(accounts[1])).toNumber(), balance.toNumber())
      })
   })


   describe('transfer function after finalize', async () => {

      var token = null

      before(async () => {
         token = await createToken()

         await token.finalize()
      })

      it("transfer tokens from owner to other", async () => {
         Utils.checkTransferEventGroup(await token.transfer(accounts[1], 1000), accounts[0], accounts[1], 1000)
      })

      it("transfer 0 tokens", async () => {
         assert.equal(await token.transfer.call(accounts[2], 0, { from: accounts[1] }), false)
         Utils.expectNoEvents(await token.transfer(accounts[2], 0, { from: accounts[1] }))
      })

      it("transfer > balance", async () => {
         const balance = await token.balanceOf.call(accounts[1])
         assert.equal(await token.transfer.call(accounts[2], balance.add(1), { from: accounts[1] }), false)
         Utils.expectNoEvents(await token.transfer(accounts[2], balance.add(1), { from: accounts[1] }))
      })

      it("transfer = balance", async () => {
         const balance1Before = await token.balanceOf.call(accounts[1])
         const balance2Before = await token.balanceOf.call(accounts[2])

         assert.equal(await token.transfer.call(accounts[2], balance1Before, { from: accounts[1] }), true)
         await token.transfer(accounts[2], balance1Before, { from: accounts[1] })

         const balance1After = await token.balanceOf.call(accounts[1])
         const balance2After = await token.balanceOf.call(accounts[2])

         assert.equal(balance1After.toNumber(), 0)
         assert.equal(balance2After.sub(balance2Before).toNumber(), balance1Before.sub(balance1After).toNumber(), balance1Before.toNumber())
      })

      it("transfer 1 token", async () => {
         const balance1Before = await token.balanceOf.call(accounts[1])
         const balance2Before = await token.balanceOf.call(accounts[2])

         assert.equal(await token.transfer.call(accounts[1], 1, { from: accounts[2] }), true)
         await token.transfer(accounts[1], 1, { from: accounts[2] })

         const balance1After = await token.balanceOf.call(accounts[1])
         const balance2After = await token.balanceOf.call(accounts[2])

         assert.equal(balance1After.toNumber(), 1)
         assert.equal(balance2After.toNumber(), balance2Before.sub(1).toNumber())
      })
   })


   describe('transferFrom function before finalize', async () => {

      var token = null

      before(async () => {
         token = await createToken()

         await token.transfer(accounts[1], 10000)
      })


      it("transfer 0 from account 1 -> 2 with 0 allowance", async () => {
         assert.equal(await token.approve.call(accounts[2], 0, { from: accounts[1] }), true)
         assert.equal(await token.allowance.call(accounts[1], accounts[2]), 0)
         await Utils.expectThrow(token.transferFrom.call(accounts[1], accounts[2], 10, { from: accounts[2] }), false)
      })

      it("transfer 1000 from account 1 -> 2 without allowance", async () => {
         await Utils.expectThrow(token.transferFrom.call(accounts[1], accounts[2], 1000, { from: accounts[1] }), false)
         await Utils.expectThrow(token.transferFrom.call(accounts[1], accounts[2], 1000, { from: accounts[2] }), false)
      })

      it("transfer 1000 from account 1 -> 2 with 10 allowance", async () => {
         assert.equal(await token.approve.call(accounts[2], 10, { from: accounts[1] }), true)
         Utils.checkApprovalEventGroup(await token.approve(accounts[2], 10, { from: accounts[1] }), accounts[1], accounts[2], 10)

         assert.equal(await token.allowance.call(accounts[1], accounts[2], { from: accounts[1] }), 10)

         await Utils.expectThrow(token.transferFrom.call(accounts[1], accounts[2], 1000, { from: accounts[1] }), false)
         await Utils.expectThrow(token.transferFrom.call(accounts[1], accounts[2], 1000, { from: accounts[2] }), false)
      })

      it("transfer 1000 from account 1 -> 2 with 1000 allowance", async () => {
         // We first need to bring approval to 0
         assert.equal(await token.approve.call(accounts[2], 0, { from: accounts[1] }), true)
         Utils.checkApprovalEventGroup(await token.approve(accounts[2], 0, { from: accounts[1] }), accounts[1], accounts[2], 0)

         assert.equal(await token.allowance.call(accounts[1], accounts[2], { from: accounts[1] }), 0)

         assert.equal(await token.approve.call(accounts[2], 1000, { from: accounts[1] }), true)
         Utils.checkApprovalEventGroup(await token.approve(accounts[2], 1000, { from: accounts[1] }), accounts[1], accounts[2], 1000)

         assert.equal(await token.allowance.call(accounts[1], accounts[2]), 1000, { from: accounts[1] })

         await Utils.expectThrow(token.transferFrom.call(accounts[1], accounts[2], 1000, { from: accounts[1] }))
         await Utils.expectThrow(token.transferFrom(accounts[1], accounts[2], 1000, { from: accounts[2] }))

         assert.equal((await token.balanceOf.call(accounts[1])).toNumber(), 10000)
         assert.equal((await token.balanceOf.call(accounts[2])).toNumber(), 0)
      })
   })


   describe('transferFrom function after finalize', async () => {

      var token = null

      before(async () => {
         token = await createToken()

         await token.transfer(accounts[1], 10000)

         token.finalize()
      })


      it("transfer 0 from account 1 -> 2 with 0", async () => {
         assert.equal(await token.approve.call(accounts[2], 0, { from: accounts[1] }), true)
         assert.equal(await token.allowance.call(accounts[1], accounts[2]), 0)
         assert.equal(await token.transferFrom.call(accounts[1], accounts[2], 0, { from: accounts[1] }), false)
         assert.equal(await token.transferFrom.call(accounts[1], accounts[2], 0, { from: accounts[2] }), false)
      })

      it("transfer 1000 from account 1 -> 2 without allowance", async () => {
         assert.equal(await token.transferFrom.call(accounts[1], accounts[2], 1000, { from: accounts[1] }), false)
         assert.equal(await token.transferFrom.call(accounts[1], accounts[2], 1000, { from: accounts[2] }), false)
      })

      it("transfer 1000 from account 1 -> 2 with 10 allowance", async () => {
         assert.equal(await token.approve.call(accounts[2], 10, { from: accounts[1] }), true)
         await token.approve(accounts[2], 10, { from: accounts[1] })
         assert.equal(await token.allowance.call(accounts[1], accounts[2]), 10)
         assert.equal(await token.transferFrom.call(accounts[1], accounts[2], 1000, { from: accounts[1] }), false)
         assert.equal(await token.transferFrom.call(accounts[1], accounts[2], 1000, { from: accounts[2] }), false)
      })

      it("transfer 1000 from account 1 -> 2 with 1000 allowance", async () => {
         // We first need to bring approval to 0
         assert.equal(await token.approve.call(accounts[2], 0, { from: accounts[1] }), true)
         await token.approve(accounts[2], 0, { from: accounts[1] })

         assert.equal(await token.allowance.call(accounts[1], accounts[2]), 0)
         assert.equal(await token.approve.call(accounts[2], 1000, { from: accounts[1] }), true)
         await token.approve(accounts[2], 1000, { from: accounts[1] })
         assert.equal(await token.allowance.call(accounts[1], accounts[2]), 1000)
         assert.equal(await token.transferFrom.call(accounts[1], accounts[2], 1000, { from: accounts[1] }), false)
         assert.equal(await token.transferFrom.call(accounts[1], accounts[2], 1000, { from: accounts[2] }), true)
         await token.transferFrom(accounts[1], accounts[2], 1000, { from: accounts[2] })
         assert.equal((await token.balanceOf.call(accounts[1])).toNumber(), 9000)
         assert.equal((await token.balanceOf.call(accounts[2])).toNumber(), 1000)
      })
   })


   describe('owner and operations', async () => {

      var token = null


      before(async () => {
         token = await createToken()

         await token.transfer(accounts[1], 10000)
         await token.transfer(accounts[2], 1000)
      })


      it("check initial owner", async () => {
         assert.equal(await token.owner.call(), accounts[0])
      })

      it("check initial ops", async () => {
         assert.equal(await token.operationsAddress.call(), 0)
      })

      it("change ops address to some account", async () => {
         assert.equal(await token.setOperationsAddress.call(accounts[5]), true)
         await token.setOperationsAddress(accounts[5])
      })

      it("change ops address to 0", async () => {
         assert.equal(await token.setOperationsAddress.call(0), true)
         await token.setOperationsAddress(0)
      })

      it("change ops address to account 1", async () => {
         assert.equal(await token.setOperationsAddress.call(accounts[1]), true)
         await token.setOperationsAddress(accounts[1])
      })

      it("finalize as normal", async () => {
         await Utils.expectThrow(token.finalize.call({ from: accounts[2] }))
      })

      it("finalize as ops", async () => {
         await Utils.expectThrow(token.finalize.call({ from: accounts[1] }))
      })
   })


   describe('finalize function', async () => {

      var token = null

      before(async () => {
         token = await createToken()
      })


      it("check properties before and after finalize", async () => {
         assert.equal(await token.finalized.call(), false)
         Utils.checkFinalizedEventGroup(await token.finalize())
         assert.equal(await token.finalized.call(), true)
      })

      it("try to finalize a 2nd time", async () => {
         await Utils.expectThrow(token.finalize.call())
      })
   })
})
