# SafeKeeper Web3 - Smart Contracts

This directory contains the Solidity smart contracts for SafeKeeper's DeFi liquidation insurance protocol.

## Overview

SafeKeeper provides on-chain insurance for leveraged trading positions. When a trader gets liquidated, they receive a 50% payout of their loss amount, reducing the sting of liquidation.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    Pricing      │────▶│  InsurancePool   │────▶│ PolicyRegistry  │
│  (calculations) │     │   (main logic)   │     │   (storage)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Contracts

| Contract | Purpose |
|----------|---------|
| `Pricing.sol` | Stateless premium calculations based on leverage |
| `PolicyRegistry.sol` | Stores policy data, tracks active policies |
| `InsurancePool.sol` | Core contract: buy insurance, submit claims, payouts |

## How It Works

### 1. Buy Insurance
```solidity
pool.buyInsurance{value: premium}(positionSize, leverage, liquidationPrice);
```
- User pays a premium based on their leverage (higher leverage = higher premium)
- Premium formula: `BASE_PREMIUM + (leverage × LEVERAGE_FACTOR)` in basis points
- Policy is stored in PolicyRegistry

### 2. Get Liquidated (off-chain)
- Backend monitors Hyperliquid for liquidation events
- When detected, backend calls `submitClaim()`

### 3. Receive Payout
```solidity
pool.submitClaim(userAddress, lossAmount);  // admin only
```
- User receives 50% of their loss amount
- Policy is marked as claimed

## Premium Calculation

| Leverage | Premium (bps) | Premium (%) |
|----------|---------------|-------------|
| 5x | 100 | 1.0% |
| 10x | 150 | 1.5% |
| 20x | 250 | 2.5% |

Example: 100 ETH position at 10x leverage = 1.5 ETH premium

## Testing

```bash
# Install dependencies
npm install

# Run all tests (125 tests)
npx hardhat test

# Compile contracts
npx hardhat compile
```

## Directory Structure

```
web3/
├── contracts/
│   ├── Pricing.sol         # Premium calculation logic
│   ├── PolicyRegistry.sol  # Policy storage and CRUD
│   └── InsurancePool.sol   # Main pool contract
├── test/
│   ├── Pricing.test.js     # 28 tests
│   ├── PolicyRegistry.test.js # 37 tests
│   ├── InsurancePool.test.js  # 52 tests
│   └── Integration.test.js    # 9 tests
├── hardhat.config.js
└── package.json
```

## Key Features

- **Trustless**: All logic on-chain, no admin can steal funds
- **50% Coverage**: Fixed payout ratio (configurable via `COVERAGE_BPS`)
- **Gas Efficient**: Swap-and-pop for policy removal
- **Admin Controls**: Pause, emergency withdraw, admin transfer
- **Pre-fundable**: Pool accepts direct ETH transfers

## Events

| Event | When |
|-------|------|
| `InsurancePurchased` | User buys insurance |
| `ClaimPaid` | Payout sent to user |
| `PoolFunded` | Pool receives ETH |
| `Paused` / `Unpaused` | Pool state changes |
