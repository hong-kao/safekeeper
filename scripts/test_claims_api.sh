#!/bin/bash
# Test Claims API Endpoints
# Run: chmod +x test_claims_api.sh && ./test_claims_api.sh

API_URL="http://localhost:4000/api"
TEST_ADDRESS="0x495b8440c4FdD996dEC386cf0deB0c56611ee3D8"

echo "=========================================="
echo "SafeKeeper Claims API Test"
echo "=========================================="

# Test 1: Get claims by user
echo -e "\n[1/3] Testing GET /claims/user/:address..."
USER_CLAIMS=$(curl -s "$API_URL/claims/user/$TEST_ADDRESS")

if echo $USER_CLAIMS | grep -q "\["; then
  CLAIM_COUNT=$(echo $USER_CLAIMS | grep -o '"id"' | wc -l)
  echo "✅ User claims endpoint working"
  echo "   Found $CLAIM_COUNT claims for $TEST_ADDRESS"
else
  echo "❌ User claims endpoint failed"
  echo "   Response: $USER_CLAIMS"
fi

# Test 2: Get recent claims
echo -e "\n[2/3] Testing GET /claims/recent..."
RECENT=$(curl -s "$API_URL/claims/recent?limit=5")

if echo $RECENT | grep -q "claims"; then
  echo "✅ Recent claims endpoint working"
else
  echo "❌ Recent claims endpoint failed"
fi

# Test 3: Get claim stats
echo -e "\n[3/3] Testing GET /claims/stats/summary..."
STATS=$(curl -s "$API_URL/claims/stats/summary")

if echo $STATS | grep -q "totalClaims"; then
  echo "✅ Claim stats endpoint working"
  echo "   Response: $STATS"
else
  echo "❌ Claim stats endpoint failed"
fi

echo -e "\n=========================================="
echo "Test Complete!"
echo "=========================================="
echo ""
echo "Expected ProfileTab behavior:"
echo "1. Shows 'Current Insurances' (ACTIVE policies)"
echo "2. Shows 'Past Insurances' (CLAIMED/EXPIRED policies)"  
echo "3. Shows 'Claims History' table with payout details"
