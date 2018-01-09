const Moment = require('moment')
const BigNumber = require('bignumber.js')
const SolidityEvent = require("web3/lib/web3/event.js")

var SimpleToken   = artifacts.require("./SimpleToken.sol")
var Trustee       = artifacts.require("./Trustee.sol")
var TokenSale     = artifacts.require("./TokenSale.sol")
var TokenSaleMock= artifacts.require("./TokenSaleMock.sol")


module.exports.deployContracts = async (artifacts, accounts) => {

   const token     = await SimpleToken.new({ from: accounts[0], gas: 3500000 })
   const trustee   = await Trustee.new(token.address, { from: accounts[0], gas: 3500000 })
   //const sale      = await TokenSale.new(token.address, trustee.address, accounts[0], { from: accounts[0], gas: 4500000 })
   const sale      = await TokenSaleMock.new(token.address, trustee.address, accounts[0], Moment().unix(), { from: accounts[0], gas: 4500000 })

   await token.setOpsAddress(sale.address)
   await trustee.setOpsAddress(sale.address)

   const TOKENS_MAX    = await sale.TOKENS_MAX.call()
   const TOKENS_SALE   = await sale.TOKENS_SALE.call()
   const TOKENS_FUTURE = await sale.TOKENS_FUTURE.call()

   const trusteeTokens = TOKENS_MAX.sub(TOKENS_SALE).sub(TOKENS_FUTURE)

   await token.transfer(sale.address, TOKENS_SALE, { from: accounts[0] })
   await token.transfer(trustee.address, trusteeTokens, { from: accounts[0] })

   await sale.initialize({ from: accounts[0] })

   return {
      token   : token,
      trustee : trustee,
      sale    : sale
   }
}


module.exports.deployTrustee = async (artifacts, accounts) => {

   const token     = await SimpleToken.new({ from: accounts[0], gas: 3500000 })
   const trustee   = await Trustee.new(token.address, { from: accounts[0], gas: 3500000 })

   return {
      token   : token,
      trustee : trustee
   }
}

module.exports.deployLockBox = async (artifacts, accounts) => {
   var FutureTokenSaleLockBoxMock = artifacts.require("./FutureTokenSaleLockBoxMock.sol")

   const token   = await SimpleToken.new()
   const trustee = await Trustee.new(token.address, { from: accounts[0], gas: 3500000 })
   const sale    = await TokenSale.new(token.address, trustee.address, accounts[0], { from: accounts[0], gas: 4500000 })
   const lockBox = await FutureTokenSaleLockBoxMock.new(token.address, sale.address, Moment().unix(), { from: accounts[0], gas: 3500000 })

   const TOKENS_FUTURE = await sale.TOKENS_FUTURE.call()

   await token.transfer(lockBox.address, TOKENS_FUTURE, { from: accounts[0] })

   return {
      token   : token,
      lockBox   : lockBox
   }
}


module.exports.deployProcessableAllocations = async (artifacts, accounts) => {

   var TokenSaleConfig            = artifacts.require("./TokenSaleConfig.sol")
   var ProcessableAllocations     = artifacts.require("./ProcessableAllocations.sol")

   const token   = await SimpleToken.new()
   const tokenSaleConfig   = await TokenSaleConfig.new()
   const trustee = await Trustee.new(token.address, { from: accounts[0], gas: 3500000 })
   const processableAllocations = await ProcessableAllocations.new(trustee.address, { from: accounts[0], gas: 3500000 })

   const TOKENS_FOUNDERS = await tokenSaleConfig.TOKENS_FOUNDERS.call()

   // Only the Admin key(s) can call certain functions
   await token.setAdminAddress(accounts[1], { from: accounts[0] })
   await trustee.setAdminAddress(accounts[1], { from: accounts[0] })

   // Trustee contract must hold tokens to process allocations
   await token.transfer(trustee.address, TOKENS_FOUNDERS, { from: accounts[0] })

   // Token must be finalized for Trustee to process allocations
   await token.finalize({ from: accounts[1] })

   return {
      trustee                  : trustee,
      processableAllocations   : processableAllocations
   }
}

module.exports.deployPresales = async (artifacts, accounts) => {
   var Presales     = artifacts.require("./Presales.sol")

   const token     = await SimpleToken.new()
   const trustee   = await Trustee.new(token.address, { from: accounts[0], gas: 3500000 })
   const tokenSale = await TokenSale.new(token.address, trustee.address, accounts[3], { from: accounts[0], gas: 4500000 })
   const presales  = await Presales.new(tokenSale.address, { from: accounts[0], gas: 3500000 })

   const TOKENS_SALE   = await tokenSale.TOKENS_SALE.call()
   const TOKENS_FUTURE = await tokenSale.TOKENS_FUTURE.call()

   await token.setOpsAddress(tokenSale.address)
   await trustee.setOpsAddress(tokenSale.address)

   // Only the Admin key(s) can call certain functions
   await tokenSale.setAdminAddress(accounts[1], { from: accounts[0] })

   // TokenSale and Trustee contracts must hold tokens to add/transfer presales
   await token.transfer(tokenSale.address, TOKENS_SALE, { from: accounts[0] })
   await token.transfer(trustee.address, TOKENS_FUTURE, { from: accounts[0] })

   return {
      tokenSale  : tokenSale,
      presales   : presales
   }
}


module.exports.deployGrantableAllocations = async (artifacts, accounts) => {

   var TokenSaleConfig            = artifacts.require("./TokenSaleConfig.sol")
   var GrantableAllocations       = artifacts.require("./GrantableAllocations.sol")

   const token   = await SimpleToken.new()
   const tokenSaleConfig   = await TokenSaleConfig.new()
   const trustee = await Trustee.new(token.address, { from: accounts[0], gas: 3500000 })
   const grantableAllocations = await GrantableAllocations.new(trustee.address, { from: accounts[0], gas: 3500000 })

   const TOKENS_FOUNDERS = await tokenSaleConfig.TOKENS_FOUNDERS.call()

   // Only the Admin key can call certain functions
   await trustee.setAdminAddress(accounts[1], { from: accounts[0] })

   // Trustee contract must hold tokens to grant allocations
   await token.transfer(trustee.address, TOKENS_FOUNDERS, { from: accounts[0] })

   return {
      trustee                  : trustee,
      grantableAllocations     : grantableAllocations
   }
}


module.exports.deployProcessables = async (artifacts, accounts) => {
   var Processables     = artifacts.require("./ProcessablesMock.sol")

   const processables  = await Processables.new({ from: accounts[0], gas: 3500000 })

   return {
      processables   : processables
   }
}


module.exports.deployBonuses = async (artifacts, accounts) => {
   var Bonuses   = artifacts.require("./Bonuses.sol")

   const token   = await SimpleToken.new({ from: accounts[1] })
   const bonuses = await Bonuses.new(token.address, { from: accounts[0], gas: 3500000 })

   // Only the Admin key can call finalize
   await token.setAdminAddress(accounts[2], { from: accounts[1] })

   // Token must be finalized for Bonuses to process bonuses (via transferFrom)
   await token.finalize({ from: accounts[2] })

   return {
      token   : token,
      bonuses : bonuses
   }
}


module.exports.changeTime = async (sale, newTime) => {
   await sale.changeTime(newTime)
};

module.exports.changeTimeLockBox = async (lockBox, newTime) => {
   await lockBox.changeTime(newTime)
};

module.exports.expectNoEvents = (result) => {
   assert.equal(result.receipt.logs.length, 0, "expected empty array of logs")
}


module.exports.checkOwnershipTransferInitiatedEventGroup = (result, _proposedOwner) => {
   assert.equal(result.logs.length, 1)

   const event = result.logs[0]

   assert.equal(event.event, "OwnershipTransferInitiated")
   assert.equal(event.args._proposedOwner, _proposedOwner)
}


module.exports.checkOwnershipTransferCompletedEventGroup = (result) => {
   assert.equal(result.logs.length, 1)

   const event = result.logs[0]

   assert.equal(event.event, "OwnershipTransferCompleted")
}


module.exports.checkAdminAddressChangedEventGroup = (result, _newAddress) => {
   assert.equal(result.logs.length, 1)

   const event = result.logs[0]

   assert.equal(event.event, "AdminAddressChanged")
   assert.equal(event.args._newAddress, _newAddress)
}


module.exports.checkOpsAddressChangedEventGroup = (result, _newAddress) => {
   assert.equal(result.logs.length, 1)

   const event = result.logs[0]

   assert.equal(event.event, "OpsAddressChanged")
   assert.equal(event.args._newAddress, _newAddress)
}


module.exports.checkTransferEventGroup = (result, _from, _to, _value) => {
   assert.equal(result.logs.length, 1)

   const event = result.logs[0]

   module.exports.checkTransferEvent(event, _from, _to, _value)
}


module.exports.checkTransferEvent = (event, _from, _to, _value) => {
   if (Number.isInteger(_value)) {
      _value = new BigNumber(_value)
   }

   assert.equal(event.event, "Transfer")
   assert.equal(event.args._from, _from)
   assert.equal(event.args._to, _to)
   assert.equal(event.args._value.toNumber(), _value.toNumber())
}


module.exports.checkTokensTransferredEventGroup = (result, _to, _value) => {
   assert.equal(result.logs.length, 1)

   const event = result.logs[0]

   if (Number.isInteger(_value)) {
      _value = new BigNumber(_value)
   }

   assert.equal(event.event, "TokensTransferred")
   assert.equal(event.args._to, _to)
   assert.equal(event.args._value.toNumber(), _value.toNumber())
}


module.exports.checkUnlockDateExtendedEventGroup = (result, _newDate) => {
   assert.equal(result.logs.length, 1)

   const event = result.logs[0]

   if (Number.isInteger(_newDate)) {
      _newDate = new BigNumber(_newDate)
   }

   assert.equal(event.event, "UnlockDateExtended")
   assert.equal(event.args._newDate.toNumber(), _newDate.toNumber())
}


module.exports.checkProcessableAllocationAddedEventGroup = (result, _grantee, _amount) => {
   assert.equal(result.logs.length, 1)

   const event = result.logs[0]

   if (Number.isInteger(_amount)) {
      _amount = new BigNumber(_amount)
   }

   assert.equal(event.event, "ProcessableAllocationAdded")
   assert.equal(event.args._grantee, _grantee)
   assert.equal(event.args._amount.toNumber(), _amount.toNumber())
}

module.exports.checkPresaleAddedToPresalesEvent = (event, _account, _baseTokens, _bonusTokens) => {
   if (Number.isInteger(_baseTokens)) {
      _baseTokens = new BigNumber(_baseTokens)
   }

   if (Number.isInteger(_bonusTokens)) {
      _bonusTokens = new BigNumber(_bonusTokens)
   }

   assert.equal(event.event, "PresaleAdded")
   assert.equal(event.args._account, _account)
   assert.equal(event.args._baseTokens.toNumber(), _baseTokens.toNumber())
   assert.equal(event.args._bonusTokens.toNumber(), _bonusTokens.toNumber())
}


module.exports.checkLockedEvent = (result) => {
   assert.equal(result.logs.length, 1)

   assert.equal(result.logs[0].event, "Locked")
}

module.exports.checkLockedEventGroup = (result) => {
   assert.equal(result.logs.length, 2)

   const ownershipEvent = result.logs[0]
   const lockedEvent = result.logs[1]

   assert.equal(ownershipEvent.event, "OwnershipTransferInitiated")
   assert.equal(lockedEvent.event, "Locked")
}


module.exports.checkApprovedEvent = (result) => {
   assert.equal(result.logs.length, 1)

   assert.equal(result.logs[0].event, "Approved")
}


module.exports.checkCompletedEvent = (result) => {
   assert.equal(result.logs.length, 1)

   assert.equal(result.logs[0].event, "Completed")
}


module.exports.checkDisapprovedEvent = (result) => {
   assert.equal(result.logs.length, 1)

   assert.equal(result.logs[0].event, "Disapproved")
}


module.exports.checkProcessableAllocationProcessedEvent = (event, _grantee, _amount, _processingStatus) => {
   if (Number.isInteger(_amount)) {
      _amount = new BigNumber(_amount)
   }

   assert.equal(event.event, "ProcessableAllocationProcessed")
   assert.equal(event.args._grantee, _grantee)
   assert.equal(event.args._amount.toNumber(), _amount.toNumber())
   assert.equal(event.args._processingStatus, _processingStatus)
}

module.exports.checkPresaleAddedToTokenSaleEvent = (event, _account, _baseTokens, _bonusTokens) => {
   if (Number.isInteger(_baseTokens)) {
      _baseTokens = new BigNumber(_baseTokens)
   }

   if (Number.isInteger(_bonusTokens)) {
      _bonusTokens = new BigNumber(_bonusTokens)
   }

   assert.equal(event.event, "PresaleAddedToTokenSale")
   assert.equal(event.args._account, _account)
   assert.equal(event.args._baseTokens.toNumber(), _baseTokens.toNumber())
   assert.equal(event.args._bonusTokens.toNumber(), _bonusTokens.toNumber())
}


module.exports.checkGrantableAllocationAddedEventGroup = (result, _grantee, _amount, _revokable) => {
   assert.equal(result.logs.length, 1)

   const event = result.logs[0]

   if (Number.isInteger(_amount)) {
      _amount = new BigNumber(_amount)
   }

   assert.equal(event.event, "GrantableAllocationAdded")
   assert.equal(event.args._grantee, _grantee)
   assert.equal(event.args._amount.toNumber(), _amount.toNumber())
   assert.equal(event.args._revokable, _revokable)
}


module.exports.checkGrantableAllocationGrantedEvent = (event, _grantee, _amount, _revokable) => {
   if (Number.isInteger(_amount)) {
      _amount = new BigNumber(_amount)
   }

   assert.equal(event.event, "GrantableAllocationGranted")
   assert.equal(event.args._grantee, _grantee)
   assert.equal(event.args._amount.toNumber(), _amount.toNumber())
   assert.equal(event.args._revokable, _revokable)
}


module.exports.checkBonusesAddedEvent = (event, _lastIndex) => {
   if (Number.isInteger(_lastIndex)) {
      _lastIndex = new BigNumber(_lastIndex)
   }

   assert.equal(event.event, "BonusesAdded")
   assert.equal(event.args._lastIndex.toNumber(), _lastIndex.toNumber())
}


module.exports.checkBonusProcessedEvent = (event, _address, _amount) => {
   if (Number.isInteger(_amount)) {
      _amount = new BigNumber(_amount)
   }

   assert.equal(event.event, "BonusProcessed")
   assert.equal(event.args._address, _address)
   assert.equal(event.args._amount.toNumber(), _amount.toNumber())
}


module.exports.checkApprovalEventGroup = (result, _owner, _spender, _value) => {
   assert.equal(result.logs.length, 1)

   const event = result.logs[0]

   if (Number.isInteger(_value)) {
      _value = new BigNumber(_value)
   }

   assert.equal(event.event, "Approval")
   assert.equal(event.args._owner, _owner)
   assert.equal(event.args._spender, _spender)
   assert.equal(event.args._value.toNumber(), _value.toNumber())
}


module.exports.checkWhitelistUpdatedEventGroup = (result, _account, _phase) => {
   assert.equal(result.receipt.logs.length, 1)

   const logs = decodeLogs(TokenSale.abi, [ result.receipt.logs[0] ])

   assert.equal(logs.length, 1)

   assert.equal(logs[0].event, "WhitelistUpdated")
   assert.equal(logs[0].args._account, _account)
   assert.equal(logs[0].args._phase, _phase)
}


module.exports.checkTokensPurchasedEventGroup = (result, _from, _beneficiary, _cost, _tokens, _autoFinalize) => {

   const eventCount = (_autoFinalize === true) ? 3 : 2

   assert.equal(result.receipt.logs.length, eventCount)

   var logs = {}

   logs.transfer = decodeLogs(SimpleToken.abi, [ result.receipt.logs[0] ])
   assert.equal(logs.transfer.length, 1)

   if (Number.isInteger(_tokens)) {
      _tokens = new BigNumber(_tokens)
   }

   module.exports.checkTransferEvent(logs.transfer[0], _from, _beneficiary, _tokens)

   logs.tokensPurchased = decodeLogs(TokenSale.abi, [ result.receipt.logs[1] ])
   assert.equal(logs.tokensPurchased.length, 1)

   if (Number.isInteger(_cost)) {
      _cost = new BigNumber(_cost)
   }

   assert.equal(logs.tokensPurchased[0].event, "TokensPurchased")
   assert.equal(logs.tokensPurchased[0].args._beneficiary, _beneficiary)
   assert.equal(logs.tokensPurchased[0].args._cost.toNumber(), _cost.toNumber())
   assert.equal(logs.tokensPurchased[0].args._tokens.toNumber(), _tokens.toNumber())

   if (_autoFinalize !== true) {
      return
   }

   logs.finalized = decodeLogs(TokenSale.abi, [ result.receipt.logs[2] ])
   assert.equal(logs.finalized.length, 1)

   assert.equal(logs.finalized[0].event, "Finalized")
}


module.exports.checkWalletChangedEventGroup = (result, _newWallet) => {
   assert.equal(result.logs.length, 1)

   const event = result.logs[0]

   assert.equal(event.event, "WalletChanged")
   assert.equal(event.args._newWallet, _newWallet)
}


module.exports.checkPresaleAddedEventGroup = (result, _account, _baseTokens, _bonusTokens) => {
   assert.equal(result.logs.length, 1)

   const event = result.logs[0]

   if (Number.isInteger(_baseTokens)) {
      _baseTokens = new BigNumber(_baseTokens)
   }

   if (Number.isInteger(_bonusTokens)) {
      _bonusTokens = new BigNumber(_bonusTokens)
   }

   assert.equal(event.event, "PresaleAdded")
   assert.equal(event.args._account, _account)
   assert.equal(event.args._baseTokens.toNumber(), _baseTokens.toNumber())
   assert.equal(event.args._bonusTokens.toNumber(), _bonusTokens.toNumber())
}


module.exports.checkTokensReclaimedEventGroup = (result, _amount) => {
   assert.equal(result.logs.length, 1)

   const event = result.logs[0]

   if (Number.isInteger(_amount)) {
      _amount = new BigNumber(_amount)
   }

   assert.equal(event.event, "TokensReclaimed")
   assert.equal(event.args._amount.toNumber(), _amount.toNumber())
}


module.exports.checkUnsoldTokensBurntEventGroup = (result, _amount) => {
   assert.equal(result.logs.length, 1)

   const event = result.logs[0]

   if (Number.isInteger(_amount)) {
      _amount = new BigNumber(_amount)
   }

   assert.equal(event.event, "UnsoldTokensBurnt")
   assert.equal(event.args._amount.toNumber(), _amount.toNumber())
}


module.exports.checkFinalizedEventGroup = (result) => {
   assert.equal(result.logs.length, 1)

   const event = result.logs[0]

   assert.equal(event.event, "Finalized")
}


module.exports.checkBurntEventGroup = (result, _from, _value) => {
   assert.equal(result.logs.length, 1)

   const event = result.logs[0]

   assert.equal(event.event, "Burnt")
   assert.equal(event._from, _from)
   assert.equal(event._value, _value)
}


module.exports.expectThrow = async (promise) => {
    try {
        await promise;
    } catch (error) {
        const invalidOpcode = error.message.search('invalid opcode') > -1;

        const outOfGas = error.message.search('out of gas') > -1;

        assert(invalidOpcode || outOfGas, `Expected throw, but got ${error} instead`);

        return;
    }

    assert(false, "Did not throw as expected");
};


module.exports.getBalance = function (address) {
  return new Promise (function (resolve, reject) {
    web3.eth.getBalance(address, function (error, result) {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    })
  })
}


module.exports.getGasPrice = function () {
  return new Promise (function (resolve, reject) {
    web3.eth.getGasPrice(function (error, result) {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    })
  })
}


module.exports.calculateTokensFromWei = function (tokensPerKEther, weiAmount) {
   return weiAmount.mul(tokensPerKEther).div(1000)
}

module.exports.calculateCostFromTokens = function (tokensPerKEther, tokenAmount) {
   return tokenAmount.mul(1000).div(tokensPerKEther)
}


module.exports.decodeLogs = (abi, logs) => {
    return decodeLogs(abi, logs)
}


function decodeLogs(abi, logs) {
   var decodedLogs = null
   try {
      decodedLogs = decodeLogsInternal(abi, logs)
   } catch(error) {
      throw new 'Could not decode receipt log for transaction ' + txID + ', message: ' + error
   }

   return decodedLogs
}


function decodeLogsInternal(abi, logs) {

   // Find events in the ABI
   var abiEvents = abi.filter(json => {
      return json.type === 'event'
   })

   if (abiEvents.length === 0) {
      return
   }

   // Build SolidityEvent objects
   var solidityEvents = []
   for (i = 0; i < abiEvents.length; i++) {
      solidityEvents.push(new SolidityEvent(null, abiEvents[i], null))
   }

   // Decode each log entry
   var decodedLogs = []
   for (i = 0; i < logs.length; i++) {

      var event = null
      for (j = 0; j < solidityEvents.length; j++) {
         if (solidityEvents[j].signature() == logs[i].topics[0].replace("0x", "")) {
            event = solidityEvents[j]
            break
         }
      }

      var decodedLog = null

      if (event != null) {
         decodedLog = event.decode(logs[i])
      } else {
         // We could not find the right event to decode this log entry, just keep as is.
         decodedLog = logs[i]
      }

      // Convert bytes32 parameters to ascii
      for (j = 0; j < abiEvents.length; j++) {
         const abiEvent = abiEvents[j]

         if (!abiEvent.inputs) {
            continue
         }

         if (abiEvent.name != decodedLog.name) {
            continue
         }

         for (k = 0; k < abiEvent.inputs; k++) {
            if (abiEvent.inputs[k].type == 'bytes32') {
               decodedLog.args[abiEvent.inputs[k].name] = hexToAscii(decodedLog.args[abiEvent.inputs[k]]);
            }
         }
      }

      decodedLogs.push(decodedLog)
   }

   return decodedLogs
}


function hexToAscii(hexStr) {
    var asciiStr = ''

    var start = (hex.substring(0, 2) === '0x') ? 2 : 0

    for (i = start; i < hexStr.length; i += 2) {
        var charCode = parseInt(hex.substr(i, 2), 16)

        if (code === 0) {
           continue
        }

        asciiStr += String.fromCharCode(code);
    }

    return asciiStr;
}

