pragma solidity ^0.4.15;

// ----------------------------------------------------------------------------
// Simple Token - Token Sale Mock Implementation
//
// Copyright (c) 2017 Simple Token and Enuma Technologies.
// http://www.simpletoken.com/
//
// The MIT Licence.
// ----------------------------------------------------------------------------


import "./SimpleToken.sol";
import "./Trustee.sol";
import "./TokenSale.sol";


//
// This extension to the TokenSale contract allows us to change the current
// time so we can test time-related functions more easily.
//
contract TokenSaleMock is TokenSale {

   uint256 public _now;


   function TokenSaleMock(SimpleToken _tokenContract, Trustee _trustee, address _wallet, uint256 _currentTime)
      TokenSale(_tokenContract, _trustee, _wallet)
   {
      _now = _currentTime;
   }


   function currentTime() public constant returns (uint256) {
      return _now;
   }


   function changeTime(uint256 _newTime) public onlyOwner returns (bool) {
      _now = _newTime;

      return true;
   }
}
