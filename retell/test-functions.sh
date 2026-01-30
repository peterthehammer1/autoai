#!/bin/bash

# Retell Functions Test Script
# Run this to test all 6 Retell functions locally before connecting to Retell

BASE_URL="${BASE_URL:-http://localhost:3001}"

echo "============================================"
echo "Retell Functions Test Suite"
echo "Testing against: $BASE_URL"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test an endpoint
test_endpoint() {
    local name=$1
    local endpoint=$2
    local data=$3
    local expected_field=$4
    
    echo -e "${YELLOW}Testing: $name${NC}"
    echo "POST $endpoint"
    echo "Data: $data"
    echo ""
    
    response=$(curl -s -X POST "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data")
    
    echo "Response:"
    echo "$response" | head -c 500
    echo ""
    echo ""
    
    # Check if response contains expected field
    if echo "$response" | grep -q "$expected_field"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED - Expected to find '$expected_field' in response${NC}"
        ((FAILED++))
    fi
    echo ""
    echo "--------------------------------------------"
    echo ""
}

# Test 1: Health Check
echo -e "${YELLOW}Testing: Health Check${NC}"
health=$(curl -s "$BASE_URL/health")
echo "GET /health"
echo "Response: $health"
if echo "$health" | grep -q "ok"; then
    echo -e "${GREEN}✓ Server is running${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Server not responding${NC}"
    ((FAILED++))
    echo ""
    echo "Make sure the backend is running: cd backend && npm run dev"
    exit 1
fi
echo ""
echo "--------------------------------------------"
echo ""

# Test 2: lookup_customer - Existing Customer
test_endpoint \
    "lookup_customer (existing customer: John Smith)" \
    "/api/retell/lookup_customer" \
    '{"phone_number": "555-234-5678"}' \
    "found"

# Test 3: lookup_customer - New Customer
test_endpoint \
    "lookup_customer (new customer)" \
    "/api/retell/lookup_customer" \
    '{"phone_number": "555-999-9999"}' \
    "found"

# Test 4: get_services - Popular
test_endpoint \
    "get_services (popular services)" \
    "/api/retell/get_services" \
    '{}' \
    "services"

# Test 5: get_services - Search
test_endpoint \
    "get_services (search: oil change)" \
    "/api/retell/get_services" \
    '{"search": "oil change"}' \
    "services"

# Test 6: get_services - Category
test_endpoint \
    "get_services (category: Brakes)" \
    "/api/retell/get_services" \
    '{"category": "Brakes"}' \
    "services"

# Test 7: get_services - With Mileage Recommendations
test_endpoint \
    "get_services (with mileage: 45000km)" \
    "/api/retell/get_services" \
    '{"mileage": 45000}' \
    "services"

# For check_availability and booking, we need a real service ID
# First, get a service ID
echo -e "${YELLOW}Fetching service ID for availability test...${NC}"
SERVICE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/retell/get_services" \
    -H "Content-Type: application/json" \
    -d '{"search": "synthetic oil"}')

# Extract first service ID (simple grep approach)
SERVICE_ID=$(echo "$SERVICE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SERVICE_ID" ]; then
    echo -e "${RED}Could not get service ID. Using placeholder.${NC}"
    SERVICE_ID="placeholder-id"
fi

echo "Using service ID: $SERVICE_ID"
echo ""
echo "--------------------------------------------"
echo ""

# Test 8: check_availability
TODAY=$(date +%Y-%m-%d)
TOMORROW=$(date -v+1d +%Y-%m-%d 2>/dev/null || date -d "+1 day" +%Y-%m-%d)

test_endpoint \
    "check_availability (tomorrow morning)" \
    "/api/retell/check_availability" \
    "{\"service_ids\": [\"$SERVICE_ID\"], \"preferred_date\": \"$TOMORROW\", \"preferred_time\": \"morning\"}" \
    "available"

# Test 9: check_availability - Afternoon
test_endpoint \
    "check_availability (any day, afternoon)" \
    "/api/retell/check_availability" \
    "{\"service_ids\": [\"$SERVICE_ID\"], \"preferred_time\": \"afternoon\", \"days_to_check\": 7}" \
    "slots"

# Test 10: get_customer_appointments - Existing Customer
test_endpoint \
    "get_customer_appointments (John Smith)" \
    "/api/retell/get_customer_appointments" \
    '{"customer_phone": "555-234-5678", "status": "upcoming"}' \
    "appointments"

# Test 11: get_customer_appointments - Non-existent Customer
test_endpoint \
    "get_customer_appointments (new customer)" \
    "/api/retell/get_customer_appointments" \
    '{"customer_phone": "555-000-0000"}' \
    "appointments"

# Test 12: Book Appointment (will create test booking)
echo -e "${YELLOW}NOTE: Skipping actual booking test to avoid creating test data.${NC}"
echo "To test book_appointment manually, run:"
echo ""
echo "curl -X POST $BASE_URL/api/retell/book_appointment \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{"
echo "    \"customer_phone\": \"555-TEST-123\","
echo "    \"customer_first_name\": \"Test\","
echo "    \"customer_last_name\": \"User\","
echo "    \"vehicle_year\": 2020,"
echo "    \"vehicle_make\": \"Honda\","
echo "    \"vehicle_model\": \"Civic\","
echo "    \"service_ids\": [\"$SERVICE_ID\"],"
echo "    \"appointment_date\": \"$TOMORROW\","
echo "    \"appointment_time\": \"10:00\""
echo "  }'"
echo ""
echo "--------------------------------------------"
echo ""

# Test 13: modify_appointment - Cancel (skipped)
echo -e "${YELLOW}NOTE: Skipping cancel/reschedule tests to preserve data.${NC}"
echo "To test modify_appointment manually:"
echo ""
echo "# Cancel:"
echo "curl -X POST $BASE_URL/api/retell/modify_appointment \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"appointment_id\": \"YOUR-APT-ID\", \"action\": \"cancel\"}'"
echo ""
echo "# Reschedule:"
echo "curl -X POST $BASE_URL/api/retell/modify_appointment \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"appointment_id\": \"YOUR-APT-ID\", \"action\": \"reschedule\", \"new_date\": \"2024-02-20\", \"new_time\": \"14:00\"}'"
echo ""
echo "--------------------------------------------"
echo ""

# Summary
echo "============================================"
echo "TEST SUMMARY"
echo "============================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! Your Retell functions are ready.${NC}"
else
    echo -e "${YELLOW}Some tests failed. Check the responses above.${NC}"
fi

echo ""
echo "============================================"
echo "NEXT STEPS"
echo "============================================"
echo ""
echo "1. Make your API publicly accessible:"
echo "   npx ngrok http 3001"
echo ""
echo "2. Copy the ngrok URL (e.g., https://abc123.ngrok.io)"
echo ""
echo "3. Go to Retell Dashboard and create your agent"
echo ""
echo "4. Add the functions from retell-config.json,"
echo "   replacing {{BASE_URL}} with your ngrok URL"
echo ""
