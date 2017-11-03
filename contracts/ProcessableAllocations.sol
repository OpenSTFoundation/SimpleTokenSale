pragma solidity ^0.4.17;

// ----------------------------------------------------------------------------
// Processable Allocations for Trustee
//
// Copyright (c) 2017 OpenST Ltd.
// https://simpletoken.org/
//
// The MIT Licence.
// ----------------------------------------------------------------------------

import "./Owned.sol";

/**
   @title TrusteeInterface
   @dev Provides interface for calling Trustee.adminAddress and Trustee.processAllocation
*/
contract TrusteeInterface {
    function adminAddress() public view returns (address);
    function processAllocation(address _grantee, uint256 _amount) external returns (bool);
}

/*
   @title ProcessableAllocations
   @notice Allocations to be processed by Trustee
*/
contract ProcessableAllocations is Owned {

	// mapping of all processable allocations
	mapping(address => ProcessableAllocation) public processableAllocations;

	// array of addresses of all grantees
	address[] public grantees;

	// status of processable allocations
	Status public status;

	// Trustee contract
	TrusteeInterface trusteeContract;

	// Maximum accounts to avoid hitting the block gas limit in
	// ProcessableAllocations.processProcessableAllocations
	uint8 public constant MAX_GRANTEES = 35;

	// enum processableAllocations status
	//   Unlocked  - unlocked and unprocessed
	//   Locked    - locked and unprocessed
	//   Processed - locked and processed
	//   Failed    - locked and processed with failure
	enum Status { Unlocked, Locked, Processed, Failed }

	// struct ProcessableAllocation
	struct ProcessableAllocation {
		uint256 amount;
		// processing status :
		//   0 - unprocessed
		//   1 - successfully processed
		//  -1 - failed to process
		int8    processingStatus;
	}

	// events
	event ProcessableAllocationAdded(address indexed _grantee, uint256 _amount);
	event ProcessableAllocationProcessed(address indexed _grantee, uint256 _amount,
		bool _processingStatus);
	event Locked();

    /**
       @dev Constructor
       @param _trusteeContract Trustee contract
    */
	function ProcessableAllocations(TrusteeInterface _trusteeContract)
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
       @dev Adds a processable allocation
       @param _grantee grantee
       @param _amount amount of tokens
    */
	function addProcessableAllocation(address _grantee, uint256 _amount) public onlyOwner onlyIfUnlocked returns (bool) {
		require(_grantee != address(0));
		require(_amount > 0);
        require(grantees.length < MAX_GRANTEES);

		ProcessableAllocation storage allocation = processableAllocations[_grantee];

		require(allocation.amount == 0);
		
		allocation.amount = _amount;
		grantees.push(_grantee);

		ProcessableAllocationAdded(_grantee, _amount);

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
       @dev Sets status to Locked so that no new processable allocations can be added
    */
	function lock() public onlyOwner onlyIfUnlocked returns (bool) {
		require(grantees.length > 0);

		status = Status.Locked;

		// on locking the processable allocations the owner is transferred
		// to admin of trustee contract
		initiateOwnershipTransfer(trusteeContract.adminAddress());

		Locked();

		return true;
	}

    /**
       @dev Submits processable allocations to Trustee for processing
       if locked (which implies that it has not previously been processed)
    */
	function processProcessableAllocations() public onlyOwner onlyIfLocked returns (bool) {
		for (uint256 i = 0; i < grantees.length; i++) {
			ProcessableAllocation storage allocation = processableAllocations[grantees[i]];
			
			require(allocation.processingStatus == 0);
			
			bool ok = trusteeContract.processAllocation(grantees[i], allocation.amount);
			allocation.processingStatus = (ok) ? int8(1) : -1;
			if (!ok) status = Status.Failed;

			ProcessableAllocationProcessed(grantees[i], allocation.amount, ok);
		}

		if (status != Status.Failed) {
			status = Status.Processed;
			return true;
		} else {
			return false;
		}
	}
}