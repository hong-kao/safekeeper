// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Pricing{
    //constants in basis points (1 bps = 0.01%)
    uint256 public constant BASE_PREMIUM = 50;
    uint256 public constant LEVERAGE_FACTOR = 10;
    uint256 public constant VOLATILITY_FACTOR = 5;

    function calculatePremium(uint256 leverage, uint256 volatility) public pure returns(uint256){
        return BASE_PREMIUM + (leverage * LEVERAGE_FACTOR) + (volatility * VOLATILITY_FACTOR);
    }

    function premiumAmount(
        uint256 positionSize,
        uint256 leverage,
        uint256 volatility
    ) public pure returns(uint256){
        uint256 bps = calculatePremium(leverage, volatility);
        return (positionSize * bps) / 10000;
    }
}
