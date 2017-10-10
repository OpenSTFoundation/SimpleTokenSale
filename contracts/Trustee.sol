pragma solidity ^0.4.15;

// ----------------------------------------------------------------------------
// Simple Token - Token Trustee Implementation
//
// Copyright (c) 2017 Simple Token and Enuma Technologies.
// http://www.simpletoken.com/
//
// The MIT Licence.
// ----------------------------------------------------------------------------

import './OpenZepplin/SafeMath.sol';
import './OpenZepplin/Ownable.sol';

import './SimpleToken.sol';
import './OpsManaged.sol';


//
// Implements a simple trustee which can release tokens based on
// an explicit call from the owner.
//
contract Trustee is OpsManaged {

   using SafeMath for uint256;


   SimpleToken public tokenContract;

   struct Allocation {
      uint256 amountGranted;
      uint256 amountTransferred;
      bool    revokable;
   }

   // Total number of tokens that are currently allocated.
   // This does not include tokens that have been processed (sent to an address) already or
   // the ones in the trustee's account that have not been allocated yet.
   uint256 public totalLocked;

   mapping (address => Allocation) public allocations;


   //
   // Events
   //
   event AllocationGranted(address indexed _from, address indexed _account, uint256 _amount, bool _revokable);
   event AllocationRevoked(address indexed _from, address indexed _account, uint256 _amountRevoked);
   event AllocationProcessed(address indexed _from, address indexed _account, uint256 _amount);
   event TokensReclaimed(uint256 _amount);


   function Trustee(SimpleToken _tokenContract)
      OpsManaged()
   {
      require(address(_tokenContract) != address(0));

      tokenContract = _tokenContract;
   }


   // Allows the owner to create new allocations for a specific account.
   function grantAllocation(address _account, uint256 _amount, bool _revokable) public onlyOwnerOrOps returns (bool) {
      require(_account != address(0));
      require(_account != address(this));
      require(_amount > 0);

      // Can't create an allocation if there is already one for this acount.
      require(allocations[_account].amountGranted == 0);

      if (isOps(msg.sender)) {
         // Once the token contract is finalized, the ops key should not be able to grant allocations any longer.
         // Before finalized, it is used by the TokenSale contract to allocate pre-sales.
         require(!tokenContract.finalized());
      }

      totalLocked = totalLocked.add(_amount);
      require(totalLocked <= tokenContract.balanceOf(address(this)));

      allocations[_account] = Allocation({
          amountGranted     : _amount,
          amountTransferred : 0,
          revokable         : _revokable
      });

      AllocationGranted(msg.sender, _account, _amount, _revokable);

      return true;
   }


   // Allows the owner to revoke allocations, if revoke is allowed.
   function revokeAllocation(address _account) external onlyOwner returns (bool) {
      require(_account != address(0));

      Allocation memory allocation = allocations[_account];

      require(allocation.revokable);

      uint256 ownerRefund = allocation.amountGranted.sub(allocation.amountTransferred);

      delete allocations[_account];

      totalLocked = totalLocked.sub(ownerRefund);

      AllocationRevoked(msg.sender, _account, ownerRefund);

      return true;
   }


   // Push model which allows the owner to transfer tokens to the beneficiary.
   // The exact amount to transfer is calculated by owner based on agreements with
   // the beneficiaries. Here we only restrict that the total amount transfered cannot
   // exceed what has been granted.
   function processAllocation(address _account, uint256 _amount) external onlyOwnerOrOps returns (bool) {
      require(_account != address(0));
      require(_amount > 0);

      Allocation storage allocation = allocations[_account];

      require(allocation.amountGranted > 0);

      uint256 transferable = allocation.amountGranted.sub(allocation.amountTransferred);

      if (transferable < _amount) {
         return false;
      }

      allocation.amountTransferred = allocation.amountTransferred.add(_amount);

      // Note that transfer will fail if the token contract has not been finalized yet.
      require(tokenContract.transfer(_account, _amount));

      totalLocked = totalLocked.sub(_amount);

      AllocationProcessed(msg.sender, _account, _amount);

      return true;
   }


   // Allows the owner to claim back all tokens that are not currently allocated.
   // Note that the trustee should be able to move tokens even before the token is
   // finalized because SimpleToken allows sending back to owner specifically.
   function reclaimTokens() external onlyOwner returns (bool) {
      uint256 ownBalance = tokenContract.balanceOf(address(this));

      require(ownBalance >= totalLocked);

      uint256 amountReclaimed = ownBalance.sub(totalLocked);

      require(tokenContract.transfer(msg.sender, amountReclaimed));

      TokensReclaimed(amountReclaimed);

      return true;
   }
}
