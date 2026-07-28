#!/usr/bin/env bash
# Order Lifecycle -- full smoke test suite
#
# REQUIRES: server running (npm run dev), and `jq` installed
#   sudo apt install jq
#
# IMPORTANT: run `npm run seed` right before this script to reset stock
# levels. Re-running this script without reseeding will give misleading
# results on P-1006 / P-1007 since their stock gets consumed/exhausted
# by earlier sections.
#
# Usage: chmod +x smoke-tests.sh && ./smoke-tests.sh

BASE_URL="http://localhost:3000"
RUN_ID=$(date +%s)   # unique suffix so idempotency keys don't collide across runs

hr() { echo; echo "======================================================================"; echo "  $1"; echo "======================================================================"; }

post_order() {
  curl -s -X POST "$BASE_URL/orders" -H "Content-Type: application/json" -d "$1"
}

# ----------------------------------------------------------------------------
hr "0. Health + catalog sanity check"
curl -s "$BASE_URL/health" | jq
curl -s "$BASE_URL/products" | jq '.products | length as $n | "\($n) products loaded"'

# ----------------------------------------------------------------------------
hr "1. Order the single-unit item (P-1006), then order it again -- second should fail cleanly"
echo "--- first order (should CONFIRM) ---"
post_order "{\"idempotency_key\":\"smoke-1-$RUN_ID\",\"items\":[{\"product_id\":\"P-1006\",\"quantity\":1}]}" \
  | jq '.order | {id, status, failure_reason, total_amount}'

echo "--- second order, same product, different key (should FAIL -- insufficient stock) ---"
post_order "{\"idempotency_key\":\"smoke-2-$RUN_ID\",\"items\":[{\"product_id\":\"P-1006\",\"quantity\":1}]}" \
  | jq '.order | {id, status, failure_reason}'

# ----------------------------------------------------------------------------
hr "2. Zero-stock item (P-1007) -- should fail immediately"
post_order "{\"idempotency_key\":\"smoke-3-$RUN_ID\",\"items\":[{\"product_id\":\"P-1007\",\"quantity\":1}]}" \
  | jq '.order | {id, status, failure_reason}'

# ----------------------------------------------------------------------------
hr "3. Multi-item order, second line fails -- first line should be reserved-then-released"
post_order "{\"idempotency_key\":\"smoke-4-$RUN_ID\",\"items\":[{\"product_id\":\"P-1001\",\"quantity\":2},{\"product_id\":\"P-1007\",\"quantity\":1}]}" \
  | jq '.order | {id, status, failure_reason, items: [.items[] | {product_id, line_status}]}'

# ----------------------------------------------------------------------------
hr "4. Same idempotency key sent twice -- second call should return the SAME order id"
KEY5="smoke-5-$RUN_ID"
echo "--- first call ---"
FIRST=$(post_order "{\"idempotency_key\":\"$KEY5\",\"items\":[{\"product_id\":\"P-1002\",\"quantity\":1}]}")
echo "$FIRST" | jq '.order | {id, status}'
echo "--- second call, same key ---"
SECOND=$(post_order "{\"idempotency_key\":\"$KEY5\",\"items\":[{\"product_id\":\"P-1002\",\"quantity\":1}]}")
echo "$SECOND" | jq '.order | {id, status}'

FIRST_ID=$(echo "$FIRST" | jq -r '.order.id')
SECOND_ID=$(echo "$SECOND" | jq -r '.order.id')
if [ "$FIRST_ID" == "$SECOND_ID" ]; then
  echo "PASS: both calls returned the same order id ($FIRST_ID)"
else
  echo "FAIL: order ids differ -- idempotency is broken ($FIRST_ID vs $SECOND_ID)"
fi

# ----------------------------------------------------------------------------
hr "5. Inventory state verification -- check actual stock, not just the order response"
echo "--- P-1001 (sold 2 in section 3's failed order -- should show total=48, reserved=0 if freshly seeded) ---"
curl -s "$BASE_URL/inventory/P-1001" | jq
echo "--- P-1006 (sold via section 1 -- should show total=0, reserved=0) ---"
curl -s "$BASE_URL/inventory/P-1006" | jq
echo "--- P-1007 (0 stock throughout -- should show total=0, reserved=0) ---"
curl -s "$BASE_URL/inventory/P-1007" | jq

# ----------------------------------------------------------------------------
hr "6. Real concurrent race -- two requests fired in parallel for a product with 1 unit"
echo "NOTE: P-1006 was already consumed in section 1 of this run."
echo "This section will show one CONFIRMED only if you reseed and run this"
echo "section alone against a product that currently has exactly 1 unit."
echo

(
  post_order "{\"idempotency_key\":\"race-a-$RUN_ID\",\"items\":[{\"product_id\":\"P-1006\",\"quantity\":1}]}" > /tmp/race_a.json &
  post_order "{\"idempotency_key\":\"race-b-$RUN_ID\",\"items\":[{\"product_id\":\"P-1006\",\"quantity\":1}]}" > /tmp/race_b.json &
  wait
)
echo "--- race A result ---"
jq '.order | {id, status, failure_reason}' /tmp/race_a.json
echo "--- race B result ---"
jq '.order | {id, status, failure_reason}' /tmp/race_b.json

A_STATUS=$(jq -r '.order.status' /tmp/race_a.json)
B_STATUS=$(jq -r '.order.status' /tmp/race_b.json)
CONFIRMED_COUNT=0
[ "$A_STATUS" == "CONFIRMED" ] && CONFIRMED_COUNT=$((CONFIRMED_COUNT+1))
[ "$B_STATUS" == "CONFIRMED" ] && CONFIRMED_COUNT=$((CONFIRMED_COUNT+1))
if [ "$CONFIRMED_COUNT" -eq 1 ]; then
  echo "PASS: exactly one request was CONFIRMED"
else
  echo "CHECK: $CONFIRMED_COUNT requests were CONFIRMED (expected exactly 1 -- reseed and re-run if this section ran against exhausted stock)"
fi
rm -f /tmp/race_a.json /tmp/race_b.json

# ----------------------------------------------------------------------------
hr "7. Validation edge cases"

echo "--- unknown product ---"
post_order "{\"idempotency_key\":\"smoke-6-$RUN_ID\",\"items\":[{\"product_id\":\"P-9999\",\"quantity\":1}]}" | jq

echo "--- missing idempotency_key ---"
curl -s -X POST "$BASE_URL/orders" -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":"P-1001","quantity":1}]}' | jq

echo "--- empty items array ---"
post_order "{\"idempotency_key\":\"smoke-7-$RUN_ID\",\"items\":[]}" | jq

echo "--- zero quantity ---"
post_order "{\"idempotency_key\":\"smoke-8-$RUN_ID\",\"items\":[{\"product_id\":\"P-1001\",\"quantity\":0}]}" | jq

echo "--- negative quantity ---"
post_order "{\"idempotency_key\":\"smoke-9-$RUN_ID\",\"items\":[{\"product_id\":\"P-1001\",\"quantity\":-3}]}" | jq

# ----------------------------------------------------------------------------
hr "8. Read endpoints"

echo "--- GET the order created in section 4 ---"
curl -s "$BASE_URL/orders/$FIRST_ID" | jq '.order | {id, status, total_amount}'

echo "--- GET a nonexistent order (should 404 cleanly) ---"
curl -s -o /tmp/resp.json -w "HTTP %{http_code}\n" "$BASE_URL/orders/nonexistent-id"
jq . /tmp/resp.json

echo "--- GET a nonexistent product (should 404 cleanly) ---"
curl -s -o /tmp/resp.json -w "HTTP %{http_code}\n" "$BASE_URL/products/P-9999"
jq . /tmp/resp.json
rm -f /tmp/resp.json

hr "Done"