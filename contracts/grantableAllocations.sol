pragma solidity ^0.4.17;

// ----------------------------------------------------------------------------
// Simple Token - Grantable Allocations for Trustee
//
// Copyright (c) 2017 Simple Token.
// http://www.simpletoken.com/
//
// The MIT Licence.
// ----------------------------------------------------------------------------

import "./Owned.sol";

/**
   @title TrusteeInterface
   @dev Provides interface for calling Trustee.adminAddress and Trustee.grantAllocation
*/
contract TrusteeInterface {
    function setAdminAddress(address _adminAddress) external returns (bool);
    function adminAddress() public view returns (address);
    function grantAllocation(address _grantee, uint256 _amount, bool _revokable) external returns (bool);
}

/*
   @title GrantableAllocations
   @notice Allocations to be granted by Trustee
*/
contract GrantableAllocations is Owned {

	// mapping of all gran allocations
	mapping(address => GrantableAllocation) public grantableAllocations;

	// array of addresses of all grantees
	address[] public grantees;

	// status of grantable allocations
	Status public status;

	// Trustee contract
	TrusteeInterface trusteeContract;

	// Trustee admin
	address public trusteeAdmin;

	// enum grantableAllocations status
	//   Unlocked  - unlocked and ungranted
	//   Locked    - locked and ungranted
	//   Granted   - locked and granted
	//   Failed    - locked and granted with failure
	enum Status { Unlocked, Locked, Granted, Failed }

	// struct GrantableAllocation
	struct GrantableAllocation {
		uint256 amount;
		bool    revokable;
		// processing status :
		//   0 - ungranted
		//   1 - successfully granted
		//  -1 - failed to grant
		int8    grantingStatus;
	}

	// events
	event GrantableAllocationAdded(address indexed _grantee, uint256 _amount, bool _revokable);
	event GrantableAllocationGranted(address indexed _grantee, uint256 _amount, bool _revokable,
		bool _processingStatus);
	event Locked();

    /**
       @dev Constructor
       @param _trusteeContract Trustee contract
    */
	function GrantableAllocations(TrusteeInterface _trusteeContract)
			 Owned()
			 public
	{
		require(address(_trusteeContract) != address(0));

		trusteeContract = _trusteeContract;
	}

    /**
       @dev Limits execution to when status is Unlocked
    */
	modifier onlyIfUnlocked() {
		require(status == Status.Unlocked);
		_;
	}

    /**
       @dev Limits execution to when status is Locked
    */
	modifier onlyIfLocked() {
		require(status == Status.Locked);
		_;
	}

    /**
       @dev Adds a grantable allocation
       @param _grantee grantee
       @param _amount amount of tokens
       @param _revokable revokable
    */
	function addGrantableAllocation(address _grantee, uint256 _amount, bool _revokable) public onlyOwner onlyIfUnlocked returns (bool) {
		require(_grantee != address(0));
		require(_amount > 0);

		GrantableAllocation storage allocation = grantableAllocations[_grantee];

		require(allocation.amount == 0);
		
		allocation.amount = _amount;
		allocation.revokable = _revokable;
		grantees.push(_grantee);

		GrantableAllocationAdded(_grantee, _amount, _revokable);

		return true;
	}

    /**
       @dev Sets status to Locked so that no new grantable allocations can be added
    */
	function lock() public onlyOwner onlyIfUnlocked returns (bool) {
		require(grantees.length > 0);

		status = Status.Locked;

		// on locking the grantable allocations the owner is transferred
		// to admin of trustee contract
		// Store admin to revert after grantable allocations are added
		trusteeAdmin = trusteeContract.adminAddress();
		initiateOwnershipTransfer(trusteeContract.adminAddress());

		Locked();

		return true;
	}

    /**
       @dev Submits grantable allocations to Trustee for granting
       if locked (which implies that it has not previously been granted)
    */
	function grantGrantableAllocations() public onlyOwner onlyIfLocked returns (bool) {
		for (uint256 i = 0; i < grantees.length; i++) {
			GrantableAllocation storage allocation = grantableAllocations[grantees[i]];
			
			require(allocation.grantingStatus == 0);
			
			bool ok = trusteeContract.grantAllocation(grantees[i], allocation.amount, allocation.revokable);
			allocation.grantingStatus = (ok == true) ? int8(1) : -1;
			if (!ok) status = Status.Failed;

			GrantableAllocationGranted(grantees[i], allocation.amount, allocation.revokable, ok);
		}

		if (status != Status.Failed) {
			status = Status.Granted;

			// Revert admin address
			trusteeContract.setAdminAddress(trusteeAdmin);
			return true;
		} else {
			return false;
		}
	}
}