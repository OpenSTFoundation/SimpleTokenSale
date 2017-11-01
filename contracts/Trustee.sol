pragma solidity ^0.4.17;

// ----------------------------------------------------------------------------
// Token Trustee Implementation
//
// Copyright (c) 2017 OpenST Ltd.
// https://simpletoken.org/
//
// The MIT Licence.
// ----------------------------------------------------------------------------


import './SimpleToken.sol';
import './OpsManaged.sol';

import './SafeMath.sol';


//
// Implements a simple trustee which can release tokens based on
// an explicit call from the owner.
//

//
// Permissions, according to the ST key management specification.
//
//                                Owner    Admin   Ops   Revoke
// grantAllocation                           x      x
// revokeAllocation                                        x
// processAllocation                                x
// reclaimTokens                             x
// setRevokeAddress                 x                      x
//

contract Trustee is OpsManaged {

    using SafeMath for uint256;


    SimpleToken public tokenContract;

    struct Allocation {
        uint256 amountGranted;
        uint256 amountTransferred;
        bool    revokable;
    }

    // The trustee has a special 'revoke' key which is allowed to revoke allocations.
    address public revokeAddress;

    // Total number of tokens that are currently allocated.
    // This does not include tokens that have been processed (sent to an address) already or
    // the ones in the trustee's account that have not been allocated yet.
    uint256 public totalLocked;

    mapping (address => Allocation) public allocations;


    //
    // Events
    //
    event AllocationGranted(address indexed _from, address indexed _account, uint256 _amount, bool _revokable);
    event AllocationRevoked(address indexed _from, address indexed _account, uint256 _amountRevoked);
    event AllocationProcessed(address indexed _from, address indexed _account, uint256 _amount);
    event RevokeAddressChanged(address indexed _newAddress);
    event TokensReclaimed(uint256 _amount);


    function Trustee(SimpleToken _tokenContract) public
        OpsManaged()
    {
        require(address(_tokenContract) != address(0));

        tokenContract = _tokenContract;
    }


    modifier onlyOwnerOrRevoke() {
        require(isOwner(msg.sender) || isRevoke(msg.sender));
        _;
    }


    modifier onlyRevoke() {
        require(isRevoke(msg.sender));
        _;
    }


    function isRevoke(address _address) private view returns (bool) {
        return (revokeAddress != address(0) && _address == revokeAddress);
    }


    // Owner and revoke can change the revoke address. Address can also be set to 0 to 'disable' it.
    function setRevokeAddress(address _revokeAddress) external onlyOwnerOrRevoke returns (bool) {
        require(_revokeAddress != owner);
        require(!isAdmin(_revokeAddress));
        require(!isOps(_revokeAddress));

        revokeAddress = _revokeAddress;

        RevokeAddressChanged(_revokeAddress);

        return true;
    }


    // Allows admin or ops to create new allocations for a specific account.
    function grantAllocation(address _account, uint256 _amount, bool _revokable) public onlyAdminOrOps returns (bool) {
        require(_account != address(0));
        require(_account != address(this));
        require(_amount > 0);

        // Can't create an allocation if there is already one for this account.
        require(allocations[_account].amountGranted == 0);

        if (isOps(msg.sender)) {
            // Once the token contract is finalized, the ops key should not be able to grant allocations any longer.
            // Before finalized, it is used by the TokenSale contract to allocate pre-sales.
            require(!tokenContract.finalized());
        }

        totalLocked = totalLocked.add(_amount);
        require(totalLocked <= tokenContract.balanceOf(address(this)));

        allocations[_account] = Allocation({
            amountGranted     : _amount,
            amountTransferred : 0,
            revokable         : _revokable
        });

        AllocationGranted(msg.sender, _account, _amount, _revokable);

        return true;
    }


    // Allows the revoke key to revoke allocations, if revoke is allowed.
    function revokeAllocation(address _account) external onlyRevoke returns (bool) {
        require(_account != address(0));

        Allocation memory allocation = allocations[_account];

        require(allocation.revokable);

        uint256 ownerRefund = allocation.amountGranted.sub(allocation.amountTransferred);

        delete allocations[_account];

        totalLocked = totalLocked.sub(ownerRefund);

        AllocationRevoked(msg.sender, _account, ownerRefund);

        return true;
    }


    // Push model which allows ops to transfer tokens to the beneficiary.
    // The exact amount to transfer is calculated based on agreements with
    // the beneficiaries. Here we only restrict that the total amount transfered cannot
    // exceed what has been granted.
    function processAllocation(address _account, uint256 _amount) external onlyOps returns (bool) {
        require(_account != address(0));
        require(_amount > 0);

        Allocation storage allocation = allocations[_account];

        require(allocation.amountGranted > 0);

        uint256 transferable = allocation.amountGranted.sub(allocation.amountTransferred);

        if (transferable < _amount) {
           return false;
        }

        allocation.amountTransferred = allocation.amountTransferred.add(_amount);

        // Note that transfer will fail if the token contract has not been finalized yet.
        require(tokenContract.transfer(_account, _amount));

        totalLocked = totalLocked.sub(_amount);

        AllocationProcessed(msg.sender, _account, _amount);

        return true;
    }


    // Allows the admin to claim back all tokens that are not currently allocated.
    // Note that the trustee should be able to move tokens even before the token is
    // finalized because SimpleToken allows sending back to owner specifically.
    function reclaimTokens() external onlyAdmin returns (bool) {
        uint256 ownBalance = tokenContract.balanceOf(address(this));

        // If balance <= amount locked, there is nothing to reclaim.
        require(ownBalance > totalLocked);

        uint256 amountReclaimed = ownBalance.sub(totalLocked);

        address tokenOwner = tokenContract.owner();
        require(tokenOwner != address(0));

        require(tokenContract.transfer(tokenOwner, amountReclaimed));

        TokensReclaimed(amountReclaimed);

        return true;
    }
}
