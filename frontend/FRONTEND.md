# SafeKeeper Frontend

Zero-styled React + Vite + VIEM boilerplate for SafeKeeper DeFi insurance.

## What Was Built

### Tech Stack
- **React 18** + **Vite 5** (fast dev server)
- **VIEM** for contract calls (no ethers.js)
- **Axios** for backend API
- **WebSocket** for real-time events

### Directory Structure

```
src/
├── services/           # core infrastructure
│   ├── api.js          # axios client for backend
│   ├── viem.js         # viem client + contract ABIs
│   └── websocket.js    # websocket client class
├── hooks/              # custom react hooks
│   ├── useInsurance.js # buy insurance, get quotes
│   ├── usePool.js      # fetch pool status
│   ├── useWallet.js    # wallet connect/disconnect
│   ├── useWebSocket.js # real-time event listener
│   └── useContract.js  # direct contract reads
├── components/
│   ├── pages/
│   │   ├── BuyInsurance.jsx   # form to buy insurance
│   │   ├── PoolStatus.jsx     # display pool metrics
│   │   └── RiskSimulator.jsx  # simulate liquidation
│   ├── shared/
│   │   ├── Input.jsx    # basic input
│   │   ├── Button.jsx   # basic button
│   │   └── Loading.jsx  # loading indicator
│   └── Navigation.jsx   # page navigation
├── App.jsx              # main app with routing
├── main.jsx             # entry point
└── index.css            # minimal reset
```

## Key Features

### 1. Services Layer

**api.js** - Axios client pointing to `localhost:8080/api`

**viem.js** - Contains:
- Public client for reading contracts
- Wallet client for writing transactions
- ABIs for InsurancePool, Pricing, PolicyRegistry
- Contract addresses from `.env`

**websocket.js** - WebSocket client for:
- pool_updates
- liquidations
- claims

### 2. Custom Hooks

| Hook | Purpose |
|------|---------|
| `useInsurance` | Get premium quotes, buy insurance, fetch policies |
| `usePool` | Fetch pool status (balance, premiums, claims) |
| `useWallet` | Connect/disconnect MetaMask |
| `useWebSocket` | Subscribe to real-time events |
| `useContract` | Direct contract reads (getPolicy, hasPolicy) |

### 3. Pages

**BuyInsurance** - Form with:
- Position size, leverage, liquidation price inputs
- Get Quote button (calls Pricing contract)
- Buy Insurance button (calls InsurancePool.buyInsurance)

**PoolStatus** - Displays:
- Pool balance, total premiums, total claims
- Active policy count
- Real-time WebSocket events

**RiskSimulator** - Shows:
- Current user policy from contract
- Health factor calculation
- Payout estimate if liquidated

## Environment Variables

```
VITE_RPC_URL=http://127.0.0.1:8545
VITE_CHAIN_ID=31337
VITE_INSURANCE_POOL_ADDRESS=0x...
VITE_PRICING_ADDRESS=0x...
VITE_POLICY_REGISTRY_ADDRESS=0x...
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
```

## Commands

```bash
npm install     # install dependencies
npm run dev     # start dev server (port 3000)
npm run build   # production build
```

## Data Flow

```
User Action (UI)
      ↓
Custom Hook (useInsurance, usePool, etc.)
      ↓
┌─────────────────┬─────────────────┐
│   API Service   │   VIEM Client   │
│   (api.js)      │   (viem.js)     │
└────────┬────────┴────────┬────────┘
         ↓                 ↓
    Backend API       Smart Contracts
 (localhost:8080)    (Hardhat/Testnet)
```

## Next Steps

1. Deploy contracts → update `.env.local`
2. Build backend API endpoints
3. Add styling (currently zero-styled)
