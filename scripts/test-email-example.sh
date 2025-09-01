#!/bin/bash
# Email Verification Testing Example Script
# This script demonstrates how to test the email verification system

echo "🧪 JobPing Email Verification Testing Example"
echo "============================================="
echo ""

# Check if development server is running
echo "🔍 Checking if development server is running..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Development server is running on port 3000"
else
    echo "❌ Development server not running. Please start it first:"
    echo "   npm run dev"
    exit 1
fi

echo ""

# Set test mode
export JOBPING_TEST_MODE=1
export NODE_ENV=development

echo "🔧 Environment configured for testing:"
echo "   JOBPING_TEST_MODE=$JOBPING_TEST_MODE"
echo "   NODE_ENV=$NODE_ENV"
echo ""

# Test 1: Basic webhook registration
echo "📝 Test 1: Testing webhook registration..."
curl -X POST http://localhost:3000/api/webhook-tally \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "FORM_RESPONSE",
    "data": {
      "fields": [
        {"key": "email", "value": "test@example.com"},
        {"key": "full_name", "value": "Test User"},
        {"key": "professional_expertise", "value": "Software Engineering"},
        {"key": "career_path", "value": "tech"}
      ]
    }
  }' | jq '.'

echo ""

# Test 2: Test email sending
echo "📧 Test 2: Testing email sending..."
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "type": "verification"
  }' | jq '.'

echo ""

# Test 3: Test token generation
echo "🔑 Test 3: Testing token generation..."
curl -X POST http://localhost:3000/api/test-token \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }' | jq '.'

echo ""

# Test 4: Test welcome email
echo "🎉 Test 4: Testing welcome email..."
curl -X POST http://localhost:3000/api/test-welcome-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }' | jq '.'

echo ""

echo "✅ Basic testing complete!"
echo ""
echo "🚀 For comprehensive testing, run:"
echo "   npm run test:email"
echo ""
echo "📧 To test with your own email:"
echo "   npm run test:email -- --email=your-email@example.com"
echo ""
echo "📄 Check the generated report:"
echo "   cat email-verification-test-report.json"
