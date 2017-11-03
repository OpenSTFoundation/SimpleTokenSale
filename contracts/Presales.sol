pragma solidity ^0.4.17;

// ----------------------------------------------------------------------------
// Presales for TokenSale
//
// Copyright (c) 2017 OpenST Ltd.
// https://simpletoken.org/
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

	// Maximum accounts to avoid hitting the block gas limit in Presales.process
	uint8 public constant MAX_ACCOUNTS = 35;

	// enum presales status
	//   Unlocked  - unlocked and unadded
	//   Locked    - locked and unadded
	//   Completed - locked and completed
	enum Status { Unlocked, Locked, Completed }

	// struct Presale
	struct Presale {
		uint256 baseTokens;
		uint256 bonusTokens;
	}

	// events
	event PresaleAdded(address indexed _account, uint256 _baseTokens, uint256 _bonusTokens);
	event PresaleAddedToTokenSale(address indexed _account, uint256 _baseTokens, uint256 _bonusTokens);
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
        require(accounts.length < MAX_ACCOUNTS);

		Presale storage presale = presales[_account];

		require(presale.baseTokens == 0);
		
		presale.baseTokens = _baseTokens;
		presale.bonusTokens = _bonusTokens;
		accounts.push(_account);

		PresaleAdded(_account, _baseTokens, _bonusTokens);

		return true;
	}

    /**
       @dev Returns addresses of accounts
    */
	function getAccounts() public view returns (address[]) {
		return accounts;
	}

    /**
       @dev Returns number of accounts
    */
	function getAccountsSize() public view returns (uint256) {
		return accounts.length;
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

			// TokenSale.addPresale (and Trustee.grantAllocation) throws;
			// false is not returned
			require(tokenSale.addPresale(accounts[i], presale.baseTokens, presale.bonusTokens));

			PresaleAddedToTokenSale(accounts[i], presale.baseTokens, presale.bonusTokens);
		}

		// Revert admin address
		tokenSale.setAdminAddress(tokenSaleAdmin);

		status = Status.Completed;

		return true;
	}
}