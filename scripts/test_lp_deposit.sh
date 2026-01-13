#!/bin/bash
# Test LP Deposit API Endpoint
# Run: chmod +x test_lp_deposit.sh && ./test_lp_deposit.sh

API_URL="http://localhost:4000/api"
TEST_ADDRESS="0x495b8440c4FdD996dEC386cf0deB0c56611ee3D8"
TEST_TX_HASH="0xtest_deposit_$(date +%s)"

echo "=========================================="
echo "SafeKeeper LP Deposit Test"
echo "=========================================="

# Test 1: Record a deposit
echo -e "\n[1/4] Testing POST /lp/deposit..."
DEPOSIT_RESPONSE=$(curl -s -X POST "$API_URL/lp/deposit" \
  -H "Content-Type: application/json" \
  -d "{
    \"userAddress\": \"$TEST_ADDRESS\",
    \"amount\": \"1000000000000000000\",
    \"sharesIssued\": \"1000000000000000000\",
    \"txHash\": \"$TEST_TX_HASH\"
  }")

if echo $DEPOSIT_RESPONSE | grep -q "success\":true"; then
  echo "✅ Deposit recorded successfully"
  echo "   Response: $DEPOSIT_RESPONSE"
else
  echo "❌ Deposit recording failed"
  echo "   Response: $DEPOSIT_RESPONSE"
fi

# Test 2: Check it appears in history
echo -e "\n[2/4] Verifying deposit in history..."
HISTORY=$(curl -s "$API_URL/lp/history/$TEST_ADDRESS")

if echo $HISTORY | grep -q "$TEST_TX_HASH"; then
  echo "✅ Deposit found in history"
else
  echo "❌ Deposit NOT found in history"
  echo "   History: $HISTORY"
fi

# Test 3: Check duplicate TX handling
echo -e "\n[3/4] Testing duplicate TX rejection..."
DUPLICATE=$(curl -s -X POST "$API_URL/lp/deposit" \
  -H "Content-Type: application/json" \
  -d "{
    \"userAddress\": \"$TEST_ADDRESS\",
    \"amount\": \"1000000000000000000\",
    \"sharesIssued\": \"1000000000000000000\",
    \"txHash\": \"$TEST_TX_HASH\"
  }")

if echo $DUPLICATE | grep -q "already recorded"; then
  echo "✅ Duplicate TX correctly rejected"
else
  echo "⚠️  Duplicate handling: $DUPLICATE"
fi

# Test 4: Check stats endpoint
echo -e "\n[4/4] Testing GET /lp/stats..."
STATS=$(curl -s "$API_URL/lp/stats")

if echo $STATS | grep -q "effectiveAprBps"; then
  echo "✅ LP stats endpoint working"
  echo "   APR: $(echo $STATS | grep -o '"effectiveAprPercent":"[^"]*"')"
  echo "   ETH Price: $(echo $STATS | grep -o '"ethPriceUsd":"[^"]*"')"
else
  echo "❌ LP stats endpoint failed"
fi

echo -e "\n=========================================="
echo "LP Deposit Test Complete!"
echo "=========================================="
