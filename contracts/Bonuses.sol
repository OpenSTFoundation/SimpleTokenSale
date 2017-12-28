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

	struct Processable {
		uint256 amount;
		bool processed;
	}

	SimpleToken public simpleToken;

	event BonusAdded(address indexed _address, uint256 _amount);
	event BonusProcessed(address indexed _address, uint256 _amount);

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
			returns(bool)
	{
		require(_amount > 0);

		Processable storage processable = processables[_address];

		require(processable.amount == 0);
		require(addInternal(_address));

		processable.amount = _amount;

		BonusAdded(_address, _amount);

		return true;
	}

	/// @dev Approves this contract
	function approve()
			external
			onlySTOwner
			returns(bool)
	{
		return approveInternal();
	}

	/// @dev Disapproves this contract
	function disapprove()
			external
			onlySTOwner
			returns(bool)
	{
		return disapproveInternal();
	}

	/// @dev Processes as many bonuses as possible from a certain index
	/// @param _from from
	/// @return to
	function process(uint256 _from)
			public
			onlyOwner
			onlyIfApproved
			returns(uint256 to)
	{
		// Obtain allowance approved for this contract
		address stOwner = simpleToken.owner();
		uint256 remainingAllowance = simpleToken.allowance(stOwner, address(this));
		require(remainingAllowance > 0);

		for(uint256 i = _from; i < addresses.length; i++) {
			// Break if there is not enough gas for another iteration and post-loop operations or insufficient allowance
			if(msg.gas < PROCESS_GAS_MINIMUM ||
			   remainingAllowance < processables[addresses[i]].amount) break;

			to = i;
			Processable storage processable = processables[addresses[i]];

			// Skip if previously processed
			if(processable.processed) continue;

			require(simpleToken.transferFrom(stOwner, addresses[i], processable.amount));

			remainingAllowance	  = remainingAllowance.sub(processable.amount);
			processable.processed = true;
			totalProcessed++;

			BonusProcessed(addresses[i], processable.amount);
		}

		if(totalProcessed == addresses.length) completeInternal();
	}

	/// @dev Returns remaining total bonuses amount to process
	/// @return total
	function remainingTotalBonuses()
			public
			view
			returns(uint256 total)
	{
		for(uint256 i = 0; i < addresses.length; i++)
			if(!processables[addresses[i]].processed) total = total.add(processables[addresses[i]].amount);
	}
}
