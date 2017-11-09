pragma solidity ^0.4.17;

// ----------------------------------------------------------------------------
// Token Sale Implementation
//
// Copyright (c) 2017 OpenST Ltd.
// https://simpletoken.org/
//
// The MIT Licence.
// ----------------------------------------------------------------------------


import "./SimpleToken.sol";
import "./Trustee.sol";
import "./TokenSaleConfig.sol";
import "./OpsManaged.sol";
import "./Pausable.sol";
import "./SafeMath.sol";


//
// Implementation of the 1st token sale for Simple Token
//
// * Lifecycle *
// Initialization sequence should be as follow:
//    1. Deploy SimpleToken contract
//    2. Deploy Trustee contract
//    3. Deploy TokenSale contract
//    4. Set operationsAddress of SimpleToken contract to TokenSale contract
//    5. Set operationsAddress of Trustee contract to TokenSale contract
//    6. Set operationsAddress of TokenSale contract to some address
//    7. Transfer tokens from owner to TokenSale contract
//    8. Transfer tokens from owner to Trustee contract
//    9. Initialize TokenSale contract
//
// Pre-sale sequence:
//    - Set tokensPerKEther
//    - Set phase1AccountTokensMax
//    - Add presales
//    - Add allocations for founders, advisors, etc.
//    - Update whitelist
//
// After-sale sequence:
//    1. Finalize the TokenSale contract
//    2. Finalize the SimpleToken contract
//    3. Set operationsAddress of TokenSale contract to 0
//    4. Set operationsAddress of SimpleToken contract to 0
//    5. Set operationsAddress of Trustee contract to some address
//
// Anytime
//    - Add/Remove allocations
//

//
// Permissions, according to the ST key management specification.
//
//                                Owner    Admin   Ops
// initialize                       x
// changeWallet                              x
// updateWhitelist                                  x
// setTokensPerKEther                        x
// setPhase1AccountTokensMax                 x
// addPresale                                x
// pause / unpause                           x
// reclaimTokens                             x
// burnUnsoldTokens                          x
// finalize                                  x
//

contract TokenSale is OpsManaged, Pausable, TokenSaleConfig { // Pausable is also Owned

    using SafeMath for uint256;


    // We keep track of whether the sale has been finalized, at which point
    // no additional contributions will be permitted.
    bool public finalized;

    // The sale end time is initially defined by the END_TIME constant but it
    // may get extended if the sale is paused.
    uint256 public endTime;
    uint256 public pausedTime;

    // Number of tokens per 1000 ETH. See TokenSaleConfig for details.
    uint256 public tokensPerKEther;

    // Keeps track of the maximum amount of tokens that an account is allowed to purchase in phase 1.
    uint256 public phase1AccountTokensMax;

    // Address where the funds collected during the sale will be forwarded.
    address public wallet;

    // Token contract that the sale contract will interact with.
    SimpleToken public tokenContract;

    // Trustee contract to hold on token balances. The following token pools will be held by trustee:
    //    - Founders
    //    - Advisors
    //    - Early investors
    //    - Presales
    Trustee public trusteeContract;

    // Total amount of tokens sold during presale + public sale. Excludes pre-sale bonuses.
    uint256 public totalTokensSold;

    // Total amount of tokens given as bonus during presale. Will influence accelerator token balance.
    uint256 public totalPresaleBase;
    uint256 public totalPresaleBonus;

    // Map of addresses that have been whitelisted in advance (and passed KYC).
    // The whitelist value indicates what phase (1 or 2) the address has been whitelisted for.
    // Addresses whitelisted for phase 1 can also contribute during phase 2.
    mapping(address => uint8) public whitelist;


    //
    // EVENTS
    //
    event Initialized();
    event PresaleAdded(address indexed _account, uint256 _baseTokens, uint256 _bonusTokens);
    event WhitelistUpdated(address indexed _account, uint8 _phase);
    event TokensPurchased(address indexed _beneficiary, uint256 _cost, uint256 _tokens, uint256 _totalSold);
    event TokensPerKEtherUpdated(uint256 _amount);
    event Phase1AccountTokensMaxUpdated(uint256 _tokens);
    event WalletChanged(address _newWallet);
    event TokensReclaimed(uint256 _amount);
    event UnsoldTokensBurnt(uint256 _amount);
    event Finalized();


    function TokenSale(SimpleToken _tokenContract, Trustee _trusteeContract, address _wallet) public
        OpsManaged()
    {
        require(address(_tokenContract) != address(0));
        require(address(_trusteeContract) != address(0));
        require(_wallet != address(0));

        require(PHASE1_START_TIME >= currentTime());
        require(PHASE2_START_TIME > PHASE1_START_TIME);
        require(END_TIME > PHASE2_START_TIME);
        require(TOKENS_PER_KETHER > 0);
        require(PHASE1_ACCOUNT_TOKENS_MAX > 0);

        // Basic check that the constants add up to TOKENS_MAX
        uint256 partialAllocations = TOKENS_FOUNDERS.add(TOKENS_ADVISORS).add(TOKENS_EARLY_BACKERS);
        require(partialAllocations.add(TOKENS_SALE).add(TOKENS_ACCELERATOR).add(TOKENS_FUTURE) == TOKENS_MAX);

        wallet                 = _wallet;
        pausedTime             = 0;
        endTime                = END_TIME;
        finalized              = false;
        tokensPerKEther        = TOKENS_PER_KETHER;
        phase1AccountTokensMax = PHASE1_ACCOUNT_TOKENS_MAX;

        tokenContract   = _tokenContract;
        trusteeContract = _trusteeContract;
    }


    // Initialize is called to check some configuration parameters.
    // It expects that a certain amount of tokens have already been assigned to the sale contract address.
    function initialize() external onlyOwner returns (bool) {
        require(totalTokensSold == 0);
        require(totalPresaleBase == 0);
        require(totalPresaleBonus == 0);

        uint256 ownBalance = tokenContract.balanceOf(address(this));
        require(ownBalance == TOKENS_SALE);

        // Simple check to confirm that tokens are present
        uint256 trusteeBalance = tokenContract.balanceOf(address(trusteeContract));
        require(trusteeBalance >= TOKENS_FUTURE);

        Initialized();

        return true;
    }


    // Allows the admin to change the wallet where ETH contributions are sent.
    function changeWallet(address _wallet) external onlyAdmin returns (bool) {
        require(_wallet != address(0));
        require(_wallet != address(this));
        require(_wallet != address(trusteeContract));
        require(_wallet != address(tokenContract));

        wallet = _wallet;

        WalletChanged(wallet);

        return true;
    }



    //
    // TIME
    //

    function currentTime() public view returns (uint256 _currentTime) {
        return now;
    }


    modifier onlyBeforeSale() {
        require(hasSaleEnded() == false);
        require(currentTime() < PHASE1_START_TIME);
       _;
    }


    modifier onlyDuringSale() {
        require(hasSaleEnded() == false && currentTime() >= PHASE1_START_TIME);
        _;
    }

    modifier onlyAfterSale() {
        // require finalized is stronger than hasSaleEnded
        require(finalized);
        _;
    }


    function hasSaleEnded() private view returns (bool) {
        // if sold out or finalized, sale has ended
        if (totalTokensSold >= TOKENS_SALE || finalized) {
            return true;
        // else if sale is not paused (pausedTime = 0) 
        // and endtime has past, then sale has ended
        } else if (pausedTime == 0 && currentTime() >= endTime) {
            return true;
        // otherwise it is not past and not paused; or paused
        // and as such not ended
        } else {
            return false;
        }
    }



    //
    // WHITELIST
    //

    // Allows ops to add accounts to the whitelist.
    // Only those accounts will be allowed to contribute during the sale.
    // _phase = 1: Can contribute during phases 1 and 2 of the sale.
    // _phase = 2: Can contribute during phase 2 of the sale only.
    // _phase = 0: Cannot contribute at all (not whitelisted).
    function updateWhitelist(address _account, uint8 _phase) external onlyOps returns (bool) {
        require(_account != address(0));
        require(_phase <= 2);
        require(!hasSaleEnded());

        whitelist[_account] = _phase;

        WhitelistUpdated(_account, _phase);

        return true;
    }



    //
    // PURCHASES / CONTRIBUTIONS
    //

    // Allows the admin to set the price for tokens sold during phases 1 and 2 of the sale.
    function setTokensPerKEther(uint256 _tokensPerKEther) external onlyAdmin onlyBeforeSale returns (bool) {
        require(_tokensPerKEther > 0);

        tokensPerKEther = _tokensPerKEther;

        TokensPerKEtherUpdated(_tokensPerKEther);

        return true;
    }


    // Allows the admin to set the maximum amount of tokens that an account can buy during phase 1 of the sale.
    function setPhase1AccountTokensMax(uint256 _tokens) external onlyAdmin onlyBeforeSale returns (bool) {
        require(_tokens > 0);

        phase1AccountTokensMax = _tokens;

        Phase1AccountTokensMaxUpdated(_tokens);

        return true;
    }


    function () external payable whenNotPaused onlyDuringSale {
        buyTokens();
    }


    // This is the main function to process incoming ETH contributions.
    function buyTokens() public payable whenNotPaused onlyDuringSale returns (bool) {
        require(msg.value >= CONTRIBUTION_MIN);
        require(msg.value <= CONTRIBUTION_MAX);
        require(totalTokensSold < TOKENS_SALE);

        // All accounts need to be whitelisted to purchase.
        uint8 whitelistedPhase = whitelist[msg.sender];
        require(whitelistedPhase > 0);

        uint256 tokensMax = TOKENS_SALE.sub(totalTokensSold);

        if (currentTime() < PHASE2_START_TIME) {
            // We are in phase 1 of the sale
            require(whitelistedPhase == 1);

            uint256 accountBalance = tokenContract.balanceOf(msg.sender);

            // Can only purchase up to a maximum per account.
            // Calculate how much of that amount is still available.
            uint256 phase1Balance = phase1AccountTokensMax.sub(accountBalance);

            if (phase1Balance < tokensMax) {
                tokensMax = phase1Balance;
            }
        }

        require(tokensMax > 0);

        uint256 tokensBought = msg.value.mul(tokensPerKEther).div(PURCHASE_DIVIDER);
        require(tokensBought > 0);

        uint256 cost = msg.value;
        uint256 refund = 0;

        if (tokensBought > tokensMax) {
            // Not enough tokens available for full contribution, we will do partial.
            tokensBought = tokensMax;

            // Calculate actual cost for partial amount of tokens.
            cost = tokensBought.mul(PURCHASE_DIVIDER).div(tokensPerKEther);

            // Calculate refund for contributor.
            refund = msg.value.sub(cost);
        }

        totalTokensSold = totalTokensSold.add(tokensBought);

        // Transfer tokens to the account
        require(tokenContract.transfer(msg.sender, tokensBought));

        // Issue a ETH refund for any unused portion of the funds.
        if (refund > 0) {
            msg.sender.transfer(refund);
        }

        // Transfer the contribution to the wallet
        wallet.transfer(msg.value.sub(refund));

        TokensPurchased(msg.sender, cost, tokensBought, totalTokensSold);

        // If all tokens available for sale have been sold out, finalize the sale automatically.
        if (totalTokensSold == TOKENS_SALE) {
            finalizeInternal();
        }

        return true;
    }


    //
    // PRESALES
    //

    // Allows the admin to record pre-sales, before the public sale starts. Presale base tokens come out of the
    // main sale pool (the 30% allocation) while bonus tokens come from the remaining token pool.
    function addPresale(address _account, uint256 _baseTokens, uint256 _bonusTokens) external onlyAdmin onlyBeforeSale returns (bool) {
        require(_account != address(0));

        // Presales may have 0 bonus tokens but need to have a base amount of tokens sold.
        require(_baseTokens > 0);
        require(_bonusTokens < _baseTokens);

        // We do not count bonus tokens as part of the sale cap.
        totalTokensSold = totalTokensSold.add(_baseTokens);
        require(totalTokensSold <= TOKENS_SALE);

        uint256 ownBalance = tokenContract.balanceOf(address(this));
        require(_baseTokens <= ownBalance);

        totalPresaleBase  = totalPresaleBase.add(_baseTokens);
        totalPresaleBonus = totalPresaleBonus.add(_bonusTokens);

        // Move base tokens to the trustee
        require(tokenContract.transfer(address(trusteeContract), _baseTokens));

        // Presale allocations are marked as locked, they cannot be removed by the owner.
        uint256 tokens = _baseTokens.add(_bonusTokens);
        require(trusteeContract.grantAllocation(_account, tokens, false /* revokable */));

        PresaleAdded(_account, _baseTokens, _bonusTokens);

        return true;
    }


    //
    // PAUSE / UNPAUSE
    //

    // Allows the owner or admin to pause the sale for any reason.
    function pause() public onlyAdmin whenNotPaused {
        require(hasSaleEnded() == false);

        pausedTime = currentTime();

        return super.pause();
    }


    // Unpause may extend the end time of the public sale.
    // Note that we do not extend the start time of each phase.
    // Currently does not extend phase 1 end time, only final end time.
    function unpause() public onlyAdmin whenPaused {

        // If owner unpauses before sale starts, no impact on end time.
        uint256 current = currentTime();

        // If owner unpauses after sale starts, calculate how to extend end.
        if (current > PHASE1_START_TIME) {
            uint256 timeDelta;

            if (pausedTime < PHASE1_START_TIME) {
                // Pause was triggered before the start time, extend by time that
                // passed from proposed start time until now.
                timeDelta = current.sub(PHASE1_START_TIME);
            } else {
                // Pause was triggered while the sale was already started.
                // Extend end time by amount of time since pause.
                timeDelta = current.sub(pausedTime);
            }

            endTime = endTime.add(timeDelta);
        }

        pausedTime = 0;

        return super.unpause();
    }


    // Allows the admin to move bonus tokens still available in the sale contract
    // out before burning all remaining unsold tokens in burnUnsoldTokens().
    // Used to distribute bonuses to token sale participants when the sale has ended
    // and all bonuses are known.
    function reclaimTokens(uint256 _amount) external onlyAfterSale onlyAdmin returns (bool) {
        uint256 ownBalance = tokenContract.balanceOf(address(this));
        require(_amount <= ownBalance);
        
        address tokenOwner = tokenContract.owner();
        require(tokenOwner != address(0));

        require(tokenContract.transfer(tokenOwner, _amount));

        TokensReclaimed(_amount);

        return true;
    }


    // Allows the admin to burn all unsold tokens in the sale contract.
    function burnUnsoldTokens() external onlyAfterSale onlyAdmin returns (bool) {
        uint256 ownBalance = tokenContract.balanceOf(address(this));

        require(tokenContract.burn(ownBalance));

        UnsoldTokensBurnt(ownBalance);

        return true;
    }


    // Allows the admin to finalize the sale and complete allocations.
    // The SimpleToken.admin also needs to finalize the token contract
    // so that token transfers are enabled.
    function finalize() external onlyAdmin returns (bool) {
        return finalizeInternal();
    }


    // The internal one will be called if tokens are sold out or
    // the end time for the sale is reached, in addition to being called
    // from the public version of finalize().
    function finalizeInternal() private returns (bool) {
        require(!finalized);

        finalized = true;

        Finalized();

        return true;
    }
}
