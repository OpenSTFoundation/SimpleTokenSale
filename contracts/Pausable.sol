pragma solidity ^0.4.17;

// ----------------------------------------------------------------------------
// Pausable Contract Implementation
//
// Copyright (c) 2017 OpenST Ltd.
// https://simpletoken.org/
//
// The MIT Licence.
//
// Based on the Pausable contract by the OpenZeppelin team.
// Copyright (c) 2016 Smart Contract Solutions, Inc.
// https://github.com/OpenZeppelin/zeppelin-solidity
// The MIT License.
// ----------------------------------------------------------------------------


import "./OpsManaged.sol";


contract Pausable is OpsManaged {

  event Pause();
  event Unpause();

  bool public paused = false;


  modifier whenNotPaused() {
    require(!paused);
    _;
  }


  modifier whenPaused() {
    require(paused);
    _;
  }


  function pause() public onlyAdmin whenNotPaused {
    paused = true;

    Pause();
  }


  function unpause() public onlyAdmin whenPaused {
    paused = false;

    Unpause();
  }
}
