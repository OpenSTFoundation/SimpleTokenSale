pragma solidity ^0.4.17;

// ----------------------------------------------------------------------------
// Future Token Sale Lock Box
//
// Copyright (c) 2017 OpenST Ltd.
// https://simpletoken.org/
//
// The MIT Licence.
// ----------------------------------------------------------------------------

import "./ERC20Interface.sol";
import "./SafeMath.sol";
import "./Owned.sol";

/**
   @title TokenSaleInterface
   @dev Provides interface for calling TokenSale.endTime
*/
contract TokenSaleInterface {
    function endTime() public view returns (uint256);
}

/**
   @title FutureTokenSaleLockBox
   @notice Holds tokens reserved for future token sales. Tokens cannot be transferred for at least six months.
*/
contract FutureTokenSaleLockBox is Owned {
    using SafeMath for uint256;

    // To enable transfers of tokens held by this contract
    ERC20Interface public simpleToken;

    // To determine earliest unlock date after which tokens held by this contract can be transferred
    TokenSaleInterface public tokenSale;

    // The unlock date is initially 26 weeks after tokenSale.endTime, but may be extended
    uint256 public unlockDate;

    event UnlockDateExtended(uint256 _newDate);
    event TokensTransferred(address indexed _to, uint256 _value);

    /**
       @dev Constructor
       @param _simpleToken SimpleToken contract
       @param _tokenSale TokenSale contract
    */
    function FutureTokenSaleLockBox(ERC20Interface _simpleToken, TokenSaleInterface _tokenSale)
             Owned()
             public
    {
        require(address(_simpleToken) != address(0));
        require(address(_tokenSale)   != address(0));

        simpleToken = _simpleToken;
        tokenSale   = _tokenSale;
        uint256 endTime = tokenSale.endTime();

        require(endTime > 0);

        unlockDate  = endTime.add(26 weeks);
    }

    /**
       @dev Limits execution to after unlock date
    */
    modifier onlyAfterUnlockDate() {
        require(hasUnlockDatePassed());
        _;
    }

    /**
       @dev Provides current time
    */
    function currentTime() public view returns (uint256) {
        return now;
    }

    /**
       @dev Determines whether unlock date has passed
    */
    function hasUnlockDatePassed() public view returns (bool) {
        return currentTime() >= unlockDate;
    }

    /**
       @dev Extends unlock date
       @param _newDate new unlock date
    */
    function extendUnlockDate(uint256 _newDate) public onlyOwner returns (bool) {
        require(_newDate > unlockDate);

        unlockDate = _newDate;
        UnlockDateExtended(_newDate);

        return true;
    }

    /**
       @dev Transfers tokens held by this contract
       @param _to account to which to transfer tokens
       @param _value value of tokens to transfer
    */
    function transfer(address _to, uint256 _value) public onlyOwner onlyAfterUnlockDate returns (bool) {
        require(simpleToken.transfer(_to, _value));

        TokensTransferred(_to, _value);

        return true;
    }
}
