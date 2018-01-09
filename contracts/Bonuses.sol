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
	Processable[] public processables;

	// Gas sufficient to exit loop and complete function
	uint256 public constant ADD_GAS_MINIMUM = 50000;

	// Gas sufficient to exit loop and complete function
	uint256 public constant PROCESS_GAS_MINIMUM = 100000;

	struct Processable {
		address addr;
		uint256 amount;
		bool processed;
	}

	SimpleToken public simpleToken;
	address public stOwner;

	event BonusesAdded(uint256 _lastIndex);
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
		stOwner = simpleToken.owner();
	}

	/// @dev Adds bonus information to processables
	/// param _addresses addresses
	/// param _amounts amounts
	/// @return true
	function add(address[] _addresses, uint[] _amounts)
			public
			onlyOwner
			returns(uint)
	{
		for (uint i = 0; i < _addresses.length; i++) {
			processables.push(Processable({ addr: _addresses[i], amount: _amounts[i], processed: false }));
			if (msg.gas < ADD_GAS_MINIMUM) break;
		}

		BonusesAdded(i);
		return i;
	}

	function lock()
			public
			onlyOwner
			onlyIfUnlocked
			returns(bool result)
	{
		require(processables.length > 0);

		status = Status.Locked;

		Locked();

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
		uint256 remainingAllowance = simpleToken.allowance(stOwner, address(this));

		for(uint256 i = _from; i < processables.length; i++) {
			// Break if there is not enough gas for another iteration and post-loop operations or insufficient allowance
			if(msg.gas < PROCESS_GAS_MINIMUM ||
			   remainingAllowance < processables[i].amount) break;

			to = i;

			// Skip if previously processed
			if(processables[i].processed) continue;

			require(simpleToken.transferFrom(stOwner, processables[i].addr, processables[i].amount));

			remainingAllowance = remainingAllowance.sub(processables[i].amount);
			processables[i].processed = true;
			totalProcessed++;

			BonusProcessed(processables[i].addr, processables[i].amount);
		}

		if(totalProcessed == processables.length) completeInternal();
	}

	/// @dev Returns remaining total bonuses amount to process
	/// @return total
	function remainingTotalBonuses()
			public
			view
			returns(uint256 total)
	{
		for(uint256 i = 0; i < processables.length; i++)
			if(!processables[i].processed) total = total.add(processables[i].amount);
	}

	/// @dev Returns size of processables
	/// @return size of processables
	function getProcessablesSize() public view returns(uint256 size) { return processables.length; }
}
