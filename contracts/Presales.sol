pragma solidity ^0.4.17;

// ----------------------------------------------------------------------------
// Simple Token - Presales for TokenSale
//
// Copyright (c) 2017 OpenST Foundation
// http://www.simpletoken.org/
//
// The MIT Licence.
// ----------------------------------------------------------------------------

import "./Owned.sol";

/**
   @title TokenSaleInterface
   @dev Provides interface for calling TokenSale.adminAddress and TokenSale.addPresale
*/
contract TokenSaleInterface {
    function setAdminAddress(address _adminAddress) external returns (bool);
    function adminAddress() public view returns (address);
    function addPresale(address _account, uint256 _baseTokens, uint256 _bonusTokens) external returns (bool);
}

/*
   @title Presales
   @notice Presales to be added to TokenSale
*/
contract Presales is Owned {

	// mapping of all presales
	mapping(address => Presale) public presales;

	// array of addresses of all accounts
	address[] public accounts;

	// status of presales
	Status public status;

	// TokenSale contract
	TokenSaleInterface public tokenSale;

	// TokenSale admin
	address public tokenSaleAdmin;

	// enum presales status
	//   Unlocked  - unlocked and unadded
	//   Locked    - locked and unadded
	//   Added - locked and added
	//   Failed    - locked and added with failure
	enum Status { Unlocked, Locked, Added, Failed }

	// struct Presale
	struct Presale {
		uint256 baseTokens;
		uint256 bonusTokens;
		// adding status :
		//   0 - unadded
		//   1 - successfully added
		//  -1 - failed to add
		int8    addingStatus;
	}

	// events
	event PresaleAdded(address indexed _account, uint256 _baseTokens, uint256 _bonusTokens);
	event PresaleAddedToTokenSale(address indexed _account, uint256 _baseTokens, uint256 _bonusTokens,
		bool _addingStatus);
	event Locked();

    /**
       @dev Constructor
       @param _tokenSale TokenSale contract
    */
	function Presales(TokenSaleInterface _tokenSale)
			 Owned()
			 public
	{
		require(address(_tokenSale) != address(0));

		tokenSale = _tokenSale;
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
       @dev Adds a presale
       @param _account account
       @param _baseTokens base tokens of tokens
       @param _bonusTokens base tokens of tokens
    */
	function addPresale(address _account, uint256 _baseTokens, uint256 _bonusTokens) public onlyOwner onlyIfUnlocked returns (bool) {
		require(_account != address(0));
        require(_baseTokens > 0);
        require(_bonusTokens < _baseTokens);

		Presale storage presale = presales[_account];

		require(presale.baseTokens == 0);
		
		presale.baseTokens = _baseTokens;
		presale.bonusTokens = _bonusTokens;
		accounts.push(_account);

		PresaleAdded(_account, _baseTokens, _bonusTokens);

		return true;
	}

    /**
       @dev Sets status to Locked so that no new presales can be added
    */
	function lock() public onlyOwner onlyIfUnlocked returns (bool) {
		require(accounts.length > 0);

		status = Status.Locked;

		// on locking the presales the owner is transferred
		// to admin of TokenSale contract
		// Store admin to revert after presales are added
		tokenSaleAdmin = tokenSale.adminAddress();
		initiateOwnershipTransfer(tokenSaleAdmin);

		Locked();

		return true;
	}

    /**
       @dev Submits presales to TokenSale for adding
       if locked (which implies that it has not previously been added)
    */
	function process() public onlyOwner onlyIfLocked returns (bool) {
		// Confirm that admin address for TokenSale has been changed
		require(tokenSale.adminAddress() == address(this));

		for (uint256 i = 0; i < accounts.length; i++) {
			Presale storage presale = presales[accounts[i]];
			
			require(presale.addingStatus == 0);
			
			bool ok = tokenSale.addPresale(accounts[i], presale.baseTokens, presale.bonusTokens);
			presale.addingStatus = (ok == true) ? int8(1) : -1;
			if (!ok) status = Status.Failed;

			PresaleAddedToTokenSale(accounts[i], presale.baseTokens, presale.bonusTokens, ok);
		}

		if (status != Status.Failed) {
			status = Status.Added;

			// Revert admin address
			tokenSale.setAdminAddress(tokenSaleAdmin);
			return true;
		} else {
			return false;
		}
	}
}