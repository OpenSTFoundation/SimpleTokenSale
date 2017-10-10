pragma solidity ^0.4.15;

// ----------------------------------------------------------------------------
// Simple Token - Standard ERC20 Token Implementation
//
// Copyright (c) 2017 Simple Token and Enuma Technologies.
// http://www.simpletoken.com/
//
// The MIT Licence.
// ----------------------------------------------------------------------------

import "./ERC20Interface.sol";

import "./OpenZepplin/Ownable.sol";
import "./OpenZepplin/SafeMath.sol";


//
// Standard ERC20 implementation, with ownership.
//
contract ERC20Token is ERC20Interface, Ownable {

    using SafeMath for uint256;

    string public symbol;
    string public name;
    uint8  public decimals;

    mapping(address => uint256) balances;
    mapping(address => mapping (address => uint256)) allowed;


    function ERC20Token(string _symbol, string _name, uint8 _decimals, uint256 _totalSupply)
        Ownable()
    {
        symbol = _symbol;
        name = _name;
        decimals = _decimals;
        totalSupply = _totalSupply;
        balances[owner] = _totalSupply;
    }


    function balanceOf(address _owner) constant returns (uint256 balance) {
        return balances[_owner];
    }


    function transfer(address _to, uint256 _value) returns (bool success) {
        if (_value == 0 || balances[msg.sender]  < _value || (balances[_to] + _value <= balances[_to])) {
           return false;
        }

        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);

        Transfer(msg.sender, _to, _value);

        return true;
    }


    function transferFrom(address _from, address _to, uint256 _value) returns (bool success) {
        if (_value == 0 || balances[_from] < _value || (balances[_to] + _value <= balances[_to])) {
           return false;
        }

        if (_value > allowed[_from][msg.sender]) {
           return false;
        }

        balances[_from] = balances[_from].sub(_value);
        allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);

        Transfer(_from, _to, _value);

        return true;
     }


     function allowance(address _owner, address _spender) constant returns (uint256 remaining) {
         return allowed[_owner][_spender];
     }


     function approve(address _spender, uint256 _value) returns (bool success) {

         // Guard for potential race condition
         // https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
         if (_value > 0 && allowed[msg.sender][_spender] > 0) {
            return false;
         }

         allowed[msg.sender][_spender] = _value;

         Approval(msg.sender, _spender, _value);

         return true;
     }
}
