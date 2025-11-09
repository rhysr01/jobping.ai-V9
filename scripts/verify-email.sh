#!/bin/bash
# Email System Verification Script
# This script verifies the email system is properly configured

echo "🔍 Email System Verification"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get domain from user or use default
DOMAIN="${1:-getjobping.com}"
TEST_EMAIL="${2:-delivered@resend.dev}"

echo "Testing domain: $DOMAIN"
echo "Test email: $TEST_EMAIL"
echo ""

# Test 1: Check if test endpoint exists
echo "📋 Test 1: Checking test endpoint..."
TEST_URL="https://${DOMAIN}/api/test-resend?to=${TEST_EMAIL}"
echo "URL: $TEST_URL"

RESPONSE=$(curl -s -w "\n%{http_code}" "$TEST_URL" 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Test endpoint is accessible${NC}"
    
    # Parse JSON response
    API_KEY_WORKING=$(echo "$BODY" | grep -o '"apiKeyWorking":[^,]*' | cut -d':' -f2 | tr -d ' ')
    EMAIL_SENDING=$(echo "$BODY" | grep -o '"emailSending":[^,]*' | cut -d':' -f2 | tr -d ' ')
    OVERALL_STATUS=$(echo "$BODY" | grep -o '"overallStatus":"[^"]*"' | cut -d'"' -f4)
    
    echo "  API Key Working: $API_KEY_WORKING"
    echo "  Email Sending: $EMAIL_SENDING"
    echo "  Overall Status: $OVERALL_STATUS"
    
    if [ "$OVERALL_STATUS" = "SUCCESS" ]; then
        echo -e "${GREEN}✅ Email system is working!${NC}"
    else
        echo -e "${RED}❌ Email system has issues${NC}"
        echo ""
        echo "Diagnostics:"
        echo "$BODY" | grep -A 20 '"diagnostics"' || echo "  Check full response for details"
    fi
else
    echo -e "${RED}❌ Test endpoint returned HTTP $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi

echo ""
echo "=============================="
echo "📊 Full Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""
echo "💡 Next Steps:"
echo "1. If overallStatus is SUCCESS, emails should work"
echo "2. If it's FAILED, check the diagnostics section"
echo "3. Verify RESEND_API_KEY in Vercel environment variables"
echo "4. Ensure domain getjobping.com is verified in Resend dashboard"

