const BigNumber = require('bignumber.js')

var ERC20Token               = artifacts.require("./ERC20Token.sol")
var SimpleToken              = artifacts.require("./SimpleToken.sol")
var Trustee                  = artifacts.require("./Trustee.sol")
var TokenSale                = artifacts.require("./TokenSale.sol")
var FutureTokenSaleLockBox   = artifacts.require("./FutureTokenSaleLockBox.sol")


module.exports = function(deployer, network, accounts) {

   var token = null
   var trustee = null
   var contract = null

   var TOKENS_MAX = 0
   var TOKENS_SALE = 0
   var TOKENS_FUTURE = 0

   return deployer.deploy(SimpleToken, { from: accounts[0], gas: 4700000 }).then(() => {
      return SimpleToken.deployed().then(instance => { token = instance })
   }).then(() => {
      return deployer.deploy(Trustee, token.address, { from: accounts[0], gas: 4700000 })
   }).then(() => {
      return Trustee.deployed().then(instance => { trustee = instance })
   }). then(() => {
      return deployer.deploy(TokenSale, token.address, trustee.address, accounts[0], { from: accounts[0], gas: 4500000 })
   }).then(() => {
      return TokenSale.deployed().then(instance => { sale = instance })
   }).then(() => {
      return deployer.deploy(FutureTokenSaleLockBox, token.address, sale.address);
   }).then(() => {
      return token.setOpsAddress(sale.address)
   }).then(() => {
      return trustee.setOpsAddress(sale.address)
   }).then(() => {
      return sale.TOKENS_MAX.call().then(tokensMax => { TOKENS_MAX = tokensMax })
   }).then(() => {
      return sale.TOKENS_SALE.call().then(tokensSale => { TOKENS_SALE = tokensSale })
   }).then(() => {
      return token.transfer(sale.address, TOKENS_SALE, { from: accounts[0] })
   }).then(() => {
      return sale.TOKENS_FUTURE.call().then(tokensFuture => { TOKENS_FUTURE = tokensFuture })
   }).then(() => {
      const amountToTransfer = TOKENS_MAX.sub(TOKENS_SALE).sub(TOKENS_FUTURE)

      return token.transfer(trustee.address, amountToTransfer, { from: accounts[0] }).then(() => {
         return sale.initialize({ from: accounts[0] })
      })
   })
}
