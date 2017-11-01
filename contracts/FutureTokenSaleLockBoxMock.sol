pragma solidity ^0.4.17;

// ----------------------------------------------------------------------------
// Future Token Sale Lock Box Mock Implementation
//
// Copyright (c) 2017 OpenST Ltd.
// https://simpletoken.org/
//
// The MIT Licence.
// ----------------------------------------------------------------------------

import "./FutureTokenSaleLockBox.sol";

/**
   @title FutureTokenSaleLockBoxMock
   @dev This extension to the FutureTokenSaleLockBox contract allows us to change the current time to enable testing time-related functions
*/
contract FutureTokenSaleLockBoxMock is FutureTokenSaleLockBox {
    uint256 public _now;

    /**
       @dev Constructor
       @param _simpleToken SimpleToken contract
       @param _tokenSale TokenSale contract
       @param _currentTime mock current time
    */
    function FutureTokenSaleLockBoxMock(ERC20Interface _simpleToken, TokenSaleInterface _tokenSale, uint256 _currentTime)
             FutureTokenSaleLockBox(_simpleToken, _tokenSale)
             public
    {
        _now = _currentTime;
    }

    /**
       @dev Provides mocked current time
    */
    function currentTime() public view returns (uint256) {
        return _now;
    }


    /**
       @dev Changes mocked current time
    */
    function changeTime(uint256 _newTime) public onlyOwner returns (bool) {
        _now = _newTime;

        return true;
    }
}
