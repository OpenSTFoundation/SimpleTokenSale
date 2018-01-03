pragma solidity ^0.4.17;

// ----------------------------------------------------------------------------
// ProcessablesMock
//
// Copyright (c) 2017 OpenST Ltd.
// https://simpletoken.org/
//
// The MIT Licence.
// ----------------------------------------------------------------------------

import "./Processables.sol";

/// @title ProcessablesMock
/// @dev Implements process function and wraps private functions to enable testing Processables
contract ProcessablesMock is Processables {
	function ProcessablesMock()
			Processables()
			public { }

	/// @dev Public wrapper for addAddress
	/// @param _address address
	function add(address _address)
			public
			returns (bool result)
	{
		result = addInternal(_address);
		return result;
	}

	/// @dev Mock process function
	/// @param _from from
	function process(uint256 _from)
			public
			returns (uint256 to)
	{
		_from;
		return to;
	}

	/// @dev Public wrapper for approveInternal
	function approve()
			public
			returns (bool result)
	{
		result = approveInternal();
		return result;
	}

	/// @dev Public wrapper for completeInternal
	function complete()
			public
			returns (bool result)
	{
		result = completeInternal();
		return result;
	}

	/// @dev Public wrapper for disapproveInternal
	function disapprove()
			public
			returns (bool result)
	{
		result = disapproveInternal();
		return result;
	}
}