pragma solidity ^0.4.17;

// ----------------------------------------------------------------------------
// Bonuses
//
// Copyright (c) 2017 OpenST Ltd.
// https://simpletoken.org/
//
// The MIT Licence.
// ----------------------------------------------------------------------------

import "./SimpleToken.sol";
import "./SafeMath.sol";
import "./Processables.sol";

/// @title Bonuses
/// @dev Aids transferring bonus tokens related to the token sale
contract Bonuses is Processables {
    using SafeMath for uint256;

	// named "processables" to aid JS interaction with this and other contracts that inherit from Processables
	mapping(address => Processable) public processables;

	// Amount of gas sufficient to conduct a single process loop iteration and post-loop operations
	uint256 public constant PROCESS_GAS_MINIMUM = 100000;

	// Total bonuses amount remaining to process after locking
	uint256 public remainingTotalBonuses = 0;

	struct Processable {
		uint256 amount;
		bool processed;
	}

	SimpleToken public simpleToken;

	event BonusAdded(address indexed _address, uint256 _amount);
	event BonusProcessed(address indexed _address, uint256 _amount, uint256 _index);

	// limits execution to SimpleToken.owner
	modifier onlySTOwner() {
        require(msg.sender == simpleToken.owner());
        _;
    }


	function Bonuses(SimpleToken _simpleToken)
			Processables()
			public
	{
		require(address(_simpleToken) != address(0));
		simpleToken = _simpleToken;
	}

	/// @dev Adds bonus information to processables
	/// @param _address address
	/// @param _amount amount
	/// @return true
	function add(address _address, uint256 _amount)
			public
			onlyOwner
			onlyIfUnlocked
			returns (bool result)
	{
		require(_address != address(0));
		require(_amount > 0);

		Processable storage processable = processables[_address];

		require(processable.amount == 0);
		require(add(_address));

		processable.amount = _amount;

		BonusAdded(_address, _amount);

		return true;
	}

	/// @dev Locks this contract
	function lock()
			public
			returns (bool result)
	{
		// onlyOwner
		result = super.lock();

		for (uint256 i = 0; i < addresses.length; i++)
			remainingTotalBonuses = remainingTotalBonuses.add(processables[addresses[i]].amount);
	}

	/// @dev Approves this contract
	function approve()
			external
			onlySTOwner
			returns (bool result)
	{
		return approveInternal();
	}

	/// @dev Disapproves this contract
	function disapprove()
			external
			onlySTOwner
			returns (bool result)
	{
		return disapproveInternal();
	}

	/// @dev Processes as many bonuses as possible from a certain index
	/// @param _from from
	/// @return true if processes last bonus, false if otherwise
	function process(uint256 _from)
			public
			onlyOwner
			onlyIfApproved
			returns (bool result)
	{
		// Confirm that this contract is approved to transfer a sufficient amount of ST
		address owner = simpleToken.owner();		
		require(simpleToken.allowance(owner, address(this)) >= remainingTotalBonuses);

		uint256 startingGas = msg.gas;

		// Breaks if there is not enough gas for both a complete iteration and post-loop operations
		for (uint256 i = _from; i < addresses.length && (block.gaslimit - (startingGas - msg.gas) > PROCESS_GAS_MINIMUM); i++) {
			Processable storage processable = processables[addresses[i]];

			// Skip if previously processed
			if (processable.processed) continue;

			require(simpleToken.transferFrom(owner, addresses[i], processable.amount));

			processable.processed = true;
			remainingTotalBonuses = remainingTotalBonuses.sub(processable.amount);

			BonusProcessed(addresses[i], processable.amount, i);
		}

		if (i == addresses.length && remainingTotalBonuses == 0) {
			complete();

			return true;
		}

		return false;
	}
}
