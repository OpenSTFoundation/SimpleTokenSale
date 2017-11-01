pragma solidity ^0.4.17;

// ----------------------------------------------------------------------------
// Admin / Ops Permission Model
//
// Copyright (c) 2017 OpenST Ltd.
// https://simpletoken.org/
//
// The MIT Licence.
// ----------------------------------------------------------------------------


import "./Owned.sol";


//
// Implements a more advanced ownership and permission model based on owner,
// admin and ops per Simple Token key management specification.
//
contract OpsManaged is Owned {

    address public opsAddress;
    address public adminAddress;

    event AdminAddressChanged(address indexed _newAddress);
    event OpsAddressChanged(address indexed _newAddress);


    function OpsManaged() public
        Owned()
    {
    }


    modifier onlyAdmin() {
        require(isAdmin(msg.sender));
        _;
    }


    modifier onlyAdminOrOps() {
        require(isAdmin(msg.sender) || isOps(msg.sender));
        _;
    }


    modifier onlyOwnerOrAdmin() {
        require(isOwner(msg.sender) || isAdmin(msg.sender));
        _;
    }


    modifier onlyOps() {
        require(isOps(msg.sender));
        _;
    }


    function isAdmin(address _address) internal view returns (bool) {
        return (adminAddress != address(0) && _address == adminAddress);
    }


    function isOps(address _address) internal view returns (bool) {
        return (opsAddress != address(0) && _address == opsAddress);
    }


    function isOwnerOrOps(address _address) internal view returns (bool) {
        return (isOwner(_address) || isOps(_address));
    }


    // Owner and Admin can change the admin address. Address can also be set to 0 to 'disable' it.
    function setAdminAddress(address _adminAddress) external onlyOwnerOrAdmin returns (bool) {
        require(_adminAddress != owner);
        require(_adminAddress != address(this));
        require(!isOps(_adminAddress));

        adminAddress = _adminAddress;

        AdminAddressChanged(_adminAddress);

        return true;
    }


    // Owner and Admin can change the operations address. Address can also be set to 0 to 'disable' it.
    function setOpsAddress(address _opsAddress) external onlyOwnerOrAdmin returns (bool) {
        require(_opsAddress != owner);
        require(_opsAddress != address(this));
        require(!isAdmin(_opsAddress));

        opsAddress = _opsAddress;

        OpsAddressChanged(_opsAddress);

        return true;
    }
}


