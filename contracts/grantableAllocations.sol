pragma solidity ^0.4.17;

// ----------------------------------------------------------------------------
// Grantable Allocations for Trustee
//
// Copyright (c) 2017 OpenST Ltd.
// https://simpletoken.org/
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

	// Maximum accounts to avoid hitting the block gas limit in GrantableAllocations.grantGrantableAllocations
	uint8 public constant MAX_GRANTEES = 35;

	// enum grantableAllocations status
	//   Unlocked  - unlocked and unadded
	//   Locked    - locked and unadded
	//   Completed - locked and completed
	enum Status { Unlocked, Locked, Completed }

	// struct GrantableAllocation
	struct GrantableAllocation {
		uint256 amount;
		bool    revokable;
	}

	// events
	event GrantableAllocationAdded(address indexed _grantee, uint256 _amount, bool _revokable);
	event GrantableAllocationGranted(address indexed _grantee, uint256 _amount, bool _revokable);
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
        require(grantees.length < MAX_GRANTEES);

		GrantableAllocation storage allocation = grantableAllocations[_grantee];

		require(allocation.amount == 0);
		
		allocation.amount = _amount;
		allocation.revokable = _revokable;
		grantees.push(_grantee);

		GrantableAllocationAdded(_grantee, _amount, _revokable);

		return true;
	}

    /**
       @dev Returns addresses of grantees
    */
	function getGrantees() public view returns (address[]) {
		return grantees;
	}

    /**
       @dev Returns number of grantees
    */
	function getGranteesSize() public view returns (uint256) {
		return grantees.length;
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
		// Confirm that admin address for Trustee has been changed
		require(trusteeContract.adminAddress() == address(this));

		for (uint256 i = 0; i < grantees.length; i++) {
			GrantableAllocation storage allocation = grantableAllocations[grantees[i]];
			
			// Trustee.grantAllocation throws--false is not returned
			require(trusteeContract.grantAllocation(grantees[i], allocation.amount, allocation.revokable));

			GrantableAllocationGranted(grantees[i], allocation.amount, allocation.revokable);
		}

		// Revert admin address
		trusteeContract.setAdminAddress(trusteeAdmin);

		status = Status.Completed;

		return true;
	}
}