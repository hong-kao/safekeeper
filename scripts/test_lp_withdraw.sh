#!/bin/bash
# Test LP Withdraw API Endpoint
# Run: chmod +x test_lp_withdraw.sh && ./test_lp_withdraw.sh

API_URL="http://localhost:4000/api"
TEST_ADDRESS="0x495b8440c4FdD996dEC386cf0deB0c56611ee3D8"
TEST_TX_HASH="0xtest_withdraw_$(date +%s)"

echo "=========================================="
echo "SafeKeeper LP Withdraw Test"
echo "=========================================="

# Test 1: Record a withdrawal
echo -e "\n[1/3] Testing POST /lp/withdraw..."
WITHDRAW_RESPONSE=$(curl -s -X POST "$API_URL/lp/withdraw" \
  -H "Content-Type: application/json" \
  -d "{
    \"userAddress\": \"$TEST_ADDRESS\",
    \"sharesBurned\": \"500000000000000000\",
    \"amountPaid\": \"510000000000000000\",
    \"txHash\": \"$TEST_TX_HASH\"
  }")

if echo $WITHDRAW_RESPONSE | grep -q "success\":true"; then
  echo "✅ Withdrawal recorded successfully"
  echo "   Response: $WITHDRAW_RESPONSE"
else
  echo "❌ Withdrawal recording failed"
  echo "   Response: $WITHDRAW_RESPONSE"
fi

# Test 2: Check it appears in history
echo -e "\n[2/3] Verifying withdrawal in history..."
HISTORY=$(curl -s "$API_URL/lp/history/$TEST_ADDRESS")

if echo $HISTORY | grep -q "$TEST_TX_HASH"; then
  echo "✅ Withdrawal found in history"
  # Count total transactions
  DEPOSIT_COUNT=$(echo $HISTORY | grep -o '"type":"DEPOSIT"' | wc -l)
  WITHDRAW_COUNT=$(echo $HISTORY | grep -o '"type":"WITHDRAW"' | wc -l)
  echo "   Total Deposits: $DEPOSIT_COUNT"
  echo "   Total Withdrawals: $WITHDRAW_COUNT"
else
  echo "❌ Withdrawal NOT found in history"
fi

# Test 3: Verify combined history
echo -e "\n[3/3] Checking combined history structure..."
echo "$HISTORY" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(f'   Deposits count: {data.get(\"summary\", {}).get(\"totalDeposits\", 0)}')
    print(f'   Withdrawals count: {data.get(\"summary\", {}).get(\"totalWithdrawals\", 0)}')
    if 'history' in data and len(data['history']) > 0:
        print(f'   ✅ History array has {len(data[\"history\"])} records')
    else:
        print('   ⚠️  History array empty or missing')
except Exception as e:
    print(f'   Error parsing: {e}')
" 2>/dev/null || echo "   (Python not available for full parsing)"

echo -e "\n=========================================="
echo "LP Withdraw Test Complete!"
echo "=========================================="
