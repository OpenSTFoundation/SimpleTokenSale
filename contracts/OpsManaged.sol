pragma solidity ^0.4.15;

// ----------------------------------------------------------------------------
// Simple Token - Operations Privileges
//
// Copyright (c) 2017 Simple Token and Enuma Technologies.
// http://www.simpletoken.com/
//
// The MIT Licence.
// ----------------------------------------------------------------------------


import "./OpenZepplin/Ownable.sol";


//
// Implements a simple 2 level access permission for owner and operations
//
contract OpsManaged is Ownable {

   address public operationsAddress;


   // Events
   event OperationsAddressChanged(address indexed _newAddress);


   function OpsManaged()
      Ownable()
   {
   }


   // The owner is allowed to change the operations address.
   // Can also be set to 0 to disable operations.
   function setOperationsAddress(address _address) external onlyOwner returns (bool) {
      require(_address != owner);

      operationsAddress = _address;

      OperationsAddressChanged(_address);

      return true;
   }


   modifier onlyOwnerOrOps() {
      require(isOwnerOrOps(msg.sender) == true);
      _;
   }


   function isOps(address _address) public constant returns (bool) {
      return (operationsAddress != address(0) && _address == operationsAddress);
   }


   function isOwnerOrOps(address _address) public constant returns (bool) {
      return (_address == owner || isOps(_address) == true);
   }
}


