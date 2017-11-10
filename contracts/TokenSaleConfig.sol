pragma solidity ^0.4.17;

// ----------------------------------------------------------------------------
// Token Sale Configuration
//
// Copyright (c) 2017 OpenST Ltd.
// https://simpletoken.org/
//
// The MIT Licence.
// ----------------------------------------------------------------------------


import "./SimpleTokenConfig.sol";


contract TokenSaleConfig is SimpleTokenConfig {

    uint256 public constant PHASE1_START_TIME         = 1510664400; // 2017-11-14, 13:00:00 UTC
    uint256 public constant PHASE2_START_TIME         = 1510750800; // 2017-11-15, 13:00:00 UTC
    uint256 public constant END_TIME                  = 1512133199; // 2017-12-01, 12:59:59 UTC
    uint256 public constant CONTRIBUTION_MIN          = 0.1 ether;
    uint256 public constant CONTRIBUTION_MAX          = 10000.0 ether;

    // This is the maximum number of tokens each individual account is allowed to
    // buy during Phase 1 of the token sale (whitelisted phase)
    // Calculated based on 300 USD/ETH * 10 ETH / 0.0833 USD / token = ~36,000
    uint256 public constant PHASE1_ACCOUNT_TOKENS_MAX = 36000     * DECIMALSFACTOR;

    uint256 public constant TOKENS_SALE               = 240000000 * DECIMALSFACTOR;
    uint256 public constant TOKENS_FOUNDERS           = 80000000  * DECIMALSFACTOR;
    uint256 public constant TOKENS_ADVISORS           = 80000000  * DECIMALSFACTOR;
    uint256 public constant TOKENS_EARLY_BACKERS      = 44884831  * DECIMALSFACTOR;
    uint256 public constant TOKENS_ACCELERATOR        = 217600000 * DECIMALSFACTOR;
    uint256 public constant TOKENS_FUTURE             = 137515169 * DECIMALSFACTOR;

    // We use a default for when the contract is deployed but this can be changed afterwards
    // by calling the setTokensPerKEther function
    // For the public sale, tokens are priced at 0.0833 USD/token.
    // So if we have 300 USD/ETH -> 300,000 USD/KETH / 0.0833 USD/token = ~3,600,000
    uint256 public constant TOKENS_PER_KETHER         = 3600000;

    // Constant used by buyTokens as part of the cost <-> tokens conversion.
    // 18 for ETH -> WEI, TOKEN_DECIMALS (18 for Simple Token), 3 for the K in tokensPerKEther.
    uint256 public constant PURCHASE_DIVIDER          = 10**(uint256(18) - TOKEN_DECIMALS + 3);

}
