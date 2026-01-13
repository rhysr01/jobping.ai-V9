#!/bin/bash

# Test script for the maintenance endpoint
# Usage: ./test-maintenance-endpoint.sh

echo "🧪 Testing Maintenance Endpoint"
echo "==============================="

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    echo "Please create .env.local with your environment variables:"
    echo ""
    echo "# Maintenance Cron Secret"
    echo "CRON_SECRET=your_secret_here"
    echo ""
    echo "# Supabase Configuration"
    echo "NEXT_PUBLIC_SUPABASE_URL=your_supabase_url"
    echo "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
    echo ""
    exit 1
fi

# Load environment variables
if [ -f ".env.local" ]; then
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ $key =~ ^[[:space:]]*# ]] && continue
        [[ -z "$key" ]] && continue
        # Skip lines without values (like VERCEL_URL=)
        [[ -z "$value" ]] && continue
        # Remove quotes from value if present
        value=$(echo "$value" | sed 's/^"//' | sed 's/"$//')
        export "$key=$value"
    done < .env.local
fi

# Check required variables
if [ -z "$CRON_SECRET" ]; then
    echo "❌ CRON_SECRET not set in .env.local"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL not set in .env.local"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY not set in .env.local"
    exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Test the endpoint
echo "🚀 Testing maintenance endpoint..."
echo "URL: http://localhost:3000/api/cron/run-maintenance"
echo ""

curl -X GET "http://localhost:3000/api/cron/run-maintenance" \
     -H "Authorization: Bearer $CRON_SECRET" \
     -H "Content-Type: application/json" \
     --connect-timeout 10 \
     --max-time 300 \
     --silent \
     --show-error \
     | jq '.' 2>/dev/null || curl -X GET "http://localhost:3000/api/cron/run-maintenance" \
                                      -H "Authorization: Bearer $CRON_SECRET" \
                                      -H "Content-Type: application/json" \
                                      --connect-timeout 10 \
                                      --max-time 300

echo ""
echo "📋 Next Steps:"
echo "1. If the test succeeded, your maintenance system is working!"
echo "2. Deploy to Vercel - the cron job will run automatically daily at 3 AM"
echo "3. Monitor Vercel function logs to see maintenance results"
echo "4. Check your database to see filtered jobs"
