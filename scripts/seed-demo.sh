#!/bin/sh
# Seed demo data after API is up
BASE_URL="${BASE_URL:-http://localhost:3000}"
TENANT="${TENANT:-demo-tenant}"

PRODUCT=$(curl -s -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: $TENANT" \
  -d '{"sku":"FLASH-001","name":"Limited Sneakers","price":"199.99","stock":100}')

PRODUCT_ID=$(echo "$PRODUCT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))")

NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
END=$(date -u -d "+2 hours" +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u -v+2H +"%Y-%m-%dT%H:%M:%S.000Z")

CAMPAIGN=$(curl -s -X POST "$BASE_URL/campaigns" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: $TENANT" \
  -d "{\"product_id\":\"$PRODUCT_ID\",\"start_time\":\"$NOW\",\"end_time\":\"$END\",\"max_per_user\":2}")

echo "Product: $PRODUCT"
echo "Campaign: $CAMPAIGN"
