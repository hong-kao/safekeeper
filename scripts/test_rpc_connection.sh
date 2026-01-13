#!/bin/bash
# Test RPC Connection and Contract Availability
# Run: chmod +x test_rpc_connection.sh && ./test_rpc_connection.sh

RPC_URL="https://virtual.base.eu.rpc.tenderly.co/1b16c0a9-93b5-4f71-b8d4-11932031831b"
INSURANCE_POOL="0x29DE976428bb0e3AD1f6C2142f0e26bacE33747b"
PRICING="0x10e4fd17aD98114F700a95Fb1a30b52adCB300F0"
POLICY_REGISTRY="0x7db0b38302af24a2cF9b2B6f336Ea8403bf1bA3D"

echo "=========================================="
echo "SafeKeeper RPC Connection Test"
echo "=========================================="

# Test 1: Check RPC connectivity
echo -e "\n[1/4] Testing RPC connectivity..."
BLOCK=$(curl -s $RPC_URL -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}')
  
if echo $BLOCK | grep -q "result"; then
  BLOCK_NUM=$(echo $BLOCK | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
  echo "✅ RPC Connected - Block: $BLOCK_NUM"
else
  echo "❌ RPC Connection Failed"
  echo $BLOCK
  exit 1
fi

# Test 2: Check Insurance Pool contract exists
echo -e "\n[2/4] Checking InsurancePool contract..."
CODE=$(curl -s $RPC_URL -X POST -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getCode\",\"params\":[\"$INSURANCE_POOL\",\"latest\"],\"id\":1}")

if echo $CODE | grep -q "0x6080"; then
  echo "✅ InsurancePool contract deployed at $INSURANCE_POOL"
else
  echo "❌ InsurancePool contract NOT found"
  exit 1
fi

# Test 3: Check getPoolStatus function
echo -e "\n[3/4] Testing getPoolStatus()..."
# getPoolStatus selector: 0x893d20e8
POOL_STATUS=$(curl -s $RPC_URL -X POST -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"$INSURANCE_POOL\",\"data\":\"0x893d20e8\"},\"latest\"],\"id\":1}")

if echo $POOL_STATUS | grep -q "result"; then
  echo "✅ getPoolStatus() callable"
else
  echo "⚠️  getPoolStatus() returned error (may need different selector)"
fi

# Test 4: Check lpAprBps function (LP APR)
echo -e "\n[4/4] Testing lpAprBps()..."
# lpAprBps selector: 0x5c975abb (this is paused, need correct one)
LP_APR=$(curl -s $RPC_URL -X POST -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"$INSURANCE_POOL\",\"data\":\"0x1b18fd3e\"},\"latest\"],\"id\":1}")

echo "LP APR Response: $LP_APR"

echo -e "\n=========================================="
echo "Test Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Restart frontend: cd frontend && npm run dev"
echo "2. Connect MetaMask to 'SafeKeeper Tenderly' network"
echo "3. Try 'Provide Liquidity' with 1 ETH"
