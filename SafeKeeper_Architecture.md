# SafeKeeper: Architecture & API Specification

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│                    Ethers.js + Wagmi Hooks                       │
└──────────────┬──────────────────────────────────────────────────┘
               │
        ┌──────┴──────┐
        ▼              ▼
    ┌────────────┐  ┌──────────────────┐
    │   Web2     │  │   Smart Contract │
    │  Backend   │  │   (Ganache/      │
    │ (Node.js)  │  │   Tenderly)      │
    └─────┬──────┘  └──────────────────┘
          │
    ┌─────┴─────────────┐
    │                   │
    ▼                   ▼
┌──────────┐      ┌──────────────┐
│ Redis    │      │ PostgreSQL   │
│(Cache)   │      │(Insurance DB)│
└──────────┘      └──────────────┘
```

---

## Web3 Smart Contracts

### 1. **InsurancePool.sol** (Core Insurance Pool)
**Responsibilities:**
- Accept insurance premium payments
- Store LP deposits
- Track active insurance policies
- Auto-trigger payouts when ZK proof verified
- Manage premium rate updates

**Key State Variables:**
```solidity
mapping(address => InsurancePolicy) public policies;
mapping(address => uint256) public lpDeposits;
mapping(address => bool) public allowedOracles;

uint256 public totalPoolCapital;
uint256 public dynamicPremiumBasisPoints; // 50-300 = 0.5-3%
```

**Core Functions:**
- `buyInsurance(uint256 positionValue) → returns policyId`
- `depositLiquidity() → returns lpShareToken`
- `withdrawLiquidity(uint256 shares)`
- `verifyLiquidationAndPayout(ZKProof zkProof, address trader)`
- `updateDynamicPremium(uint256 newBasisPoints)` *(only backend oracle)*

---

### 2. **ZKOracleVerifier.sol** (ZK Proof Verification)
**Responsibilities:**
- Verify ZK proofs of liquidations cryptographically
- Ensure proof corresponds to a real Hyperliquid liquidation
- Emit events that trigger payout logic

**Core Functions:**
- `verifyLiquidationProof(bytes calldata proof, bytes calldata publicInput) → bool`
- `recordVerifiedLiquidation(address trader, uint256 lossAmount)`

---

### 3. **PremiumCalculator.sol** (On-Chain Premium Logic - Fallback)
**Responsibilities:**
- Fallback premium calculation if backend is unavailable
- Rule-based pricing: base rate + volatility + leverage multipliers
- Pool stress adjustment (if capital < min threshold, increase premiums)

**Core Functions:**
- `calculateBaselineRate(uint256 leverage, uint256 volatility) → basisPoints`
- `adjustForPoolStress() → newBasisPoints`

---

## Web2 Backend Architecture

### Tech Stack
- **Runtime:** Node.js + Express.js (TypeScript)
- **Real-Time:** WebSocket for liquidation streaming
- **Database:** PostgreSQL (policies, users, claims)
- **Cache:** Redis (price feeds, recent liquidations, premium calculations)
- **Orchestration:** Bull (job queue for async tasks)

### Database Schema

```sql
-- Core Tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE insurance_policies (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  policy_id INT UNIQUE NOT NULL, -- matches on-chain policyId
  position_value DECIMAL(20, 8),
  premium_paid DECIMAL(20, 8),
  coverage_amount DECIMAL(20, 8), -- 50-80% of position
  coverage_percentage INT, -- 50-80
  status VARCHAR(20), -- 'ACTIVE', 'LIQUIDATED', 'EXPIRED'
  created_at TIMESTAMP,
  liquidated_at TIMESTAMP
);

CREATE TABLE liquidation_events (
  id SERIAL PRIMARY KEY,
  trader_wallet VARCHAR(42),
  loss_amount DECIMAL(20, 8),
  position_value DECIMAL(20, 8),
  timestamp TIMESTAMP NOT NULL,
  hyperliquid_block INT,
  zk_proof_verified BOOLEAN DEFAULT FALSE,
  claim_paid BOOLEAN DEFAULT FALSE,
  claim_id INT REFERENCES insurance_claims(id)
);

CREATE TABLE insurance_claims (
  id SERIAL PRIMARY KEY,
  policy_id INT REFERENCES insurance_policies(id),
  liquidation_event_id INT REFERENCES liquidation_events(id),
  claim_amount DECIMAL(20, 8),
  status VARCHAR(20), -- 'PENDING', 'VERIFIED', 'PAID', 'REJECTED'
  tx_hash_payout VARCHAR(66),
  created_at TIMESTAMP,
  verified_at TIMESTAMP,
  paid_at TIMESTAMP
);

CREATE TABLE pool_metrics (
  id SERIAL PRIMARY KEY,
  total_capital DECIMAL(30, 8),
  total_insured DECIMAL(30, 8),
  dynamic_premium_bps INT, -- basis points
  pool_stress_level DECIMAL(5, 2), -- 0.0-1.0
  updated_at TIMESTAMP
);
```

---

## Backend Modules & Responsibilities

### 1. **Premium Service** (Routes: `/premium/*`)
- Calculate ML-based premiums (simplified for MVP—use volatility multiplier only)
- Fallback to on-chain calculator
- Cache results in Redis (5-min TTL)

### 2. **Liquidation Listener** (WebSocket + Job Queue)
- Connect to Hyperliquid WebSocket (fetch recent liquidations)
- Match liquidations against insured traders
- Trigger ZK proof generation & on-chain verification

### 3. **Risk Simulator Service** (Routes: `/risk/*`)
- Fetch trader health factor from Hyperliquid
- Calculate time-to-liquidation
- Show insurance payout preview

### 4. **Oracle Service** (Internal + Routes: `/oracle/*`)
- Generate ZK proofs for verified liquidations (call ZK service)
- Update dynamic premium on-chain when pool stress changes

### 5. **Pool Service** (Routes: `/pool/*`)
- Fetch pool TVL, total insured, stress metrics
- Calculate LP yields

### 6. **Auth & Web3 Integration**
- Wallet signature verification
- EIP-712 typed data for meta-transactions (optional)

---

## API Endpoints (Web2 Backend)

### **1. Premium & Pricing Endpoints**

#### `GET /premium/calculate`
**Purpose:** Calculate insurance premium for a position.  
**Input:** `{ positionSize: number, leverage: number, asset: string }`  
**Output:** `{ premiumBasisPoints: number, premiumAmount: number, totalCost: number }`  
**Type:** Direct Backend Logic (ML disabled for MVP, use fallback formulas)

#### `GET /premium/dynamic-rate`
**Purpose:** Fetch current dynamic premium rate from pool.  
**Input:** None  
**Output:** `{ currentBasisPoints: number, minBps: number, maxBps: number, poolStress: number }`  
**Type:** Proxy (reads from on-chain InsurancePool)

---

### **2. Insurance Purchase & Management**

#### `POST /insurance/buy` *(Before calling smart contract)*
**Purpose:** Validate insurance purchase, generate ZK proof commitments, return tx data.  
**Input:** `{ walletAddress: string, positionValue: number, coverage: 50|60|70|80 }`  
**Output:** `{ policyId: number, premiumAmount: number, encodedContractCall: string, estimatedGas: number }`  
**Type:** Direct Backend Logic (prepares tx, stores pending policy in DB)

#### `GET /insurance/policy/:policyId`
**Purpose:** Fetch policy details.  
**Input:** Path: `policyId`  
**Output:** `{ policyId, positionValue, premiumPaid, coverageAmount, status, createdAt, isActive }`  
**Type:** Direct Backend Logic (reads from PostgreSQL)

#### `GET /insurance/policies/:walletAddress`
**Purpose:** Fetch all policies for a wallet.  
**Input:** Path: `walletAddress`  
**Output:** `{ policies: [ {...}, {...} ] }`  
**Type:** Direct Backend Logic

---

### **3. Risk & Liquidation Events**

#### `GET /risk/health-factor/:walletAddress`
**Purpose:** Get current health factor from Hyperliquid, show time-to-liquidation.  
**Input:** Path: `walletAddress`  
**Output:** `{ healthFactor: number, leverage: number, marginUsed: number, timeToLiquidation: string, riskLevel: "low|medium|high" }`  
**Type:** Proxy (fetches Hyperliquid subaccount state via REST/WebSocket)

#### `GET /risk/payout-preview/:policyId`
**Purpose:** Calculate payout if liquidated now.  
**Input:** Path: `policyId`  
**Output:** `{ currentPositionValue: number, estimatedLoss: number, estimatedPayout: number, payoutPercentage: number }`  
**Type:** Direct Backend Logic (reads policy + live price data)

#### `WebSocket /ws/liquidations`
**Purpose:** Real-time liquidation stream for a wallet.  
**Input:** `{ action: "subscribe", walletAddress: string }`  
**Output:** `{ event: "liquidation_detected", trader: string, loss: number, timestamp: number }`  
**Type:** Direct Backend Logic (WebSocket listener on Hyperliquid)

---

### **4. Claims & Payouts**

#### `GET /claims/:policyId`
**Purpose:** Check claim status.  
**Input:** Path: `policyId`  
**Output:** `{ claimId, status: "pending|verified|paid|rejected", claimAmount, txHash, createdAt, paidAt }`  
**Type:** Direct Backend Logic (reads from DB)

#### `POST /claims/verify-liquidation` *(Backend → Backend, ZK Service)*
**Purpose:** Generate and verify ZK proof, trigger on-chain payout.  
**Input:** `{ policyId: number, liquidationEventId: number }`  
**Output:** `{ proofGenerated: boolean, onChainTxHash: string, payoutAmount: number, status: string }`  
**Type:** Proxy (calls ZKOracleVerifier contract, returns tx hash)

---

### **5. Pool & Liquidity Provider Endpoints**

#### `GET /pool/status`
**Purpose:** Fetch pool metrics (TVL, total insured, premium rate, stress).  
**Input:** None  
**Output:** `{ totalCapital: number, totalInsured: number, utilizationRatio: number, dynamicPremium: number, poolStress: number, averagePayoutRatio: number }`  
**Type:** Proxy (reads from on-chain InsurancePool)

#### `POST /pool/deposit` *(Before calling smart contract)*
**Purpose:** Prepare LP deposit transaction.  
**Input:** `{ walletAddress: string, amountToDeposit: number }`  
**Output:** `{ encodedContractCall: string, estimatedGas: number, estimatedSharesReceived: number }`  
**Type:** Direct Backend Logic

#### `GET /pool/lp-yield/:walletAddress`
**Purpose:** Fetch estimated LP yield and withdrawal options.  
**Input:** Path: `walletAddress`  
**Output:** `{ lpShares: number, underlyingValue: number, premiumsEarned: number, feesEarned: number, estimatedAPY: number }`  
**Type:** Direct Backend Logic (calculates from pool metrics + user deposits)

---

### **6. Admin & Oracle-Only Endpoints**

#### `POST /admin/update-premium` *(Backend → Smart Contract, Oracle Role Only)*
**Purpose:** Update dynamic premium on-chain when pool stress changes.  
**Input:** `{ newBasisPoints: number, reason: string }`  
**Output:** `{ txHash: string, newRate: number, timestamp: number }`  
**Type:** Direct Contract Call (calls InsurancePool.updateDynamicPremium)

#### `POST /admin/process-liquidation-batch` *(Backend Cron Job)*
**Purpose:** Batch-process liquidations detected in last N minutes.  
**Input:** `{ timeLookbackSeconds: number }`  
**Output:** `{ processed: number, verified: number, failed: number }`  
**Type:** Direct Backend Logic (batch job, calls ZK verification for each)

---

## Endpoint Classification Table

| Endpoint | Type | What It Calls |
|----------|------|---------------|
| `GET /premium/calculate` | Direct Backend | Rule-based formula (no ML for MVP) |
| `GET /premium/dynamic-rate` | Proxy | InsurancePool.sol (read) |
| `POST /insurance/buy` | Direct Backend | PostgreSQL insert + prepares tx data |
| `GET /insurance/policy/:id` | Direct Backend | PostgreSQL query |
| `GET /risk/health-factor/:wallet` | Proxy | Hyperliquid REST/WebSocket |
| `GET /risk/payout-preview/:id` | Direct Backend | Policy DB + price feeds |
| `WebSocket /ws/liquidations` | Direct Backend | Hyperliquid WebSocket subscription |
| `GET /claims/:id` | Direct Backend | PostgreSQL query |
| `POST /claims/verify-liquidation` | Proxy | ZKOracleVerifier.sol + InsurancePool.sol |
| `GET /pool/status` | Proxy | InsurancePool.sol (read) |
| `POST /pool/deposit` | Direct Backend | Prepares tx data |
| `GET /pool/lp-yield/:wallet` | Direct Backend | Pool metrics + user data |
| `POST /admin/update-premium` | Direct Contract Call | InsurancePool.sol (write) |
| `POST /admin/process-liquidation-batch` | Direct Backend | Cron job, calls ZK verification |

---

## Smart Contract Call Flow (MVP)

### **Buying Insurance (User Perspective)**

```
Frontend
  └─> POST /insurance/buy
        └─> Backend validates, creates pending policy in DB
            Returns: contractCall encoded data + gas estimate
  └─> User confirms tx in wallet
  └─> Frontend calls InsurancePool.buyInsurance(positionValue) directly
        └─> Contract accepts premium, stores policy on-chain
  └─> Backend listening to contract events
        └─> Updates policy status to "ACTIVE" in PostgreSQL
```

### **Liquidation Detection & Payout (Automated)**

```
Backend Liquidation Listener (WebSocket)
  └─> Detects trader liquidation on Hyperliquid
  └─> Finds matching active policy in PostgreSQL
  └─> Calls POST /claims/verify-liquidation (internal)
        └─> Generates ZK proof (simulated or real)
        └─> Calls ZKOracleVerifier.verifyLiquidationProof()
        └─> If verified, calls InsurancePool.verifyLiquidationAndPayout(proof)
  └─> Contract sends payout to trader address
  └─> Backend marks claim as "PAID" in DB
```

---

## Deployment Notes for Ganache/Tenderly

### Ganache Local Setup
```bash
# Start Ganache
ganache-cli --deterministic --accounts 10 --host 0.0.0.0

# Deploy contracts
npx hardhat run scripts/deploy.ts --network localhost

# Backend .env
RPC_URL=http://localhost:8545
INSURANCE_POOL_ADDRESS=0x...
ZK_ORACLE_ADDRESS=0x...
PRIVATE_KEY=0x... (backend signer for oracle updates)
```

### Tenderly Testnet Setup
```bash
# Use Tenderly Goerli/Sepolia fork
# Update Hardhat config with Tenderly RPC

RPC_URL=https://goerli.tenderly.co/...
TENDERLY_ACCESS_KEY=...
```

---

## Summary: Direct Calls vs Proxies

**Direct Backend Logic (PostgreSQL/Redis):**
- Premium calculation
- Policy fetching
- Risk preview
- LP yield calculation

**Proxies to Smart Contracts (Read-Only):**
- Dynamic premium rate
- Pool status (TVL, stress)

**Direct Smart Contract Calls (Write):**
- Buy insurance (user-initiated)
- Deposit liquidity (user-initiated)
- Verify liquidation & payout (backend oracle-initiated)
- Update dynamic premium (backend oracle-initiated)

---

## Next Steps

1. **Smart Contracts:** Deploy InsurancePool.sol + ZKOracleVerifier.sol to Ganache
2. **Backend:** Set up Express.js server + PostgreSQL + Redis
3. **Liquidation Listener:** Integrate Hyperliquid WebSocket feed
4. **Frontend:** Call `/insurance/buy` → get encoded tx → send to contract
5. **Testing:** Simulate liquidation events, verify claim payouts on testnet
