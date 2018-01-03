pragma solidity ^0.4.17;

// ----------------------------------------------------------------------------
// Processables
//
// Copyright (c) 2017 OpenST Ltd.
// https://simpletoken.org/
//
// The MIT Licence.
// ----------------------------------------------------------------------------

import "./Owned.sol";

/// @title Processables
/// @dev Abstract contract to be inherited by operations contracts that aid certain transfers related to the token sale
contract Processables is Owned {
	address[] public addresses;

	// Count of successful process iterations
	uint256 public totalProcessed;

	// status of this contract
	Status public status;

	// enum processables status
	//   Unlocked
	//   Locked
	//   Approved
	//   Completed
	//	 Disapproved
	enum Status { Unlocked, Locked, Approved, Completed, Disapproved }

	event Locked();
	event Approved();
	event Completed();
	event Disapproved();

	// limits execution to when this contract is unlocked
	modifier onlyIfUnlocked() {
		require(status == Status.Unlocked);
		_;
	}

	// limits execution to when this contract is locked
	modifier onlyIfLocked() {
		require(status == Status.Locked);
		_;
	}

	// limits execution to when this contract is approved
	modifier onlyIfApproved() {
		require(status == Status.Approved);
		_;
	}

	// limits execution to when this contract is locked or approved
	modifier onlyIfLockedOrApproved() {
		require(status == Status.Locked ||
				status == Status.Approved);
		_;
	}

	/// @dev Constructor
	function Processables()
			Owned()
			public { }

	/// @dev Adds address to addresses
	/// @param _address address to add
	/// @return true
	function addInternal(address _address)
			internal
			onlyIfUnlocked
			returns(bool result)
	{
		require(_address != address(0));
		addresses.push(_address);

		return true;
	}

	/// @dev Returns addresses
	/// @return addresses array
	function getAddresses() public view returns(address[]) { return addresses; }

	/// @dev Returns size of addresses
	/// @return size of addresses
	function getAddressesSize() public view returns(uint256 size) { return addresses.length; }

	/// @dev Sets status to Locked
	/// @return true
	function lock()
			public
			onlyOwner
			onlyIfUnlocked
			returns(bool result)
	{
		require(addresses.length > 0);

		status = Status.Locked;

		Locked();

		return true;
	}

	/// @dev Sets status to Approved, to be called by inheriting contracts with access control
	/// @return true
	function approveInternal()
			internal
			onlyIfLocked
			returns(bool result)
	{
		status = Status.Approved;

		Approved();

		return true;
	}

	/// @dev Sets status to Completed, to be called by inheriting contracts with access control
	/// @return true
	function completeInternal()
			internal
			onlyIfApproved
			returns(bool result)
	{
		status = Status.Completed;

		Completed();

		return true;
	}

	/// @dev Sets status to Disapproved, to be called by inheriting contracts with access control
	/// @return true
	function disapproveInternal()
			internal
			onlyIfLockedOrApproved
			returns(bool result)
	{
		status = Status.Disapproved;

		Disapproved();

		return true;
	}

	/// @dev Interface for processing processables to be implemented by inheriting contracts
	/// @param _from index of address at which to begin processing 	
	/// @return index of final address processed
	function process(uint256 _from) public returns(uint256 to);
}