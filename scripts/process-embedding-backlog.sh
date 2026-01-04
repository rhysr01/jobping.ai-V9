#!/bin/bash

# Process embedding backlog using the API endpoint
# This script processes jobs in batches of 100 until the queue is empty

# Load environment variables
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
else
  echo "❌ .env.local not found!"
  exit 1
fi

# Check if SYSTEM_API_KEY is set
if [ -z "$SYSTEM_API_KEY" ]; then
  echo "❌ SYSTEM_API_KEY not set in .env.local!"
  exit 1
fi

# Check if server is running
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "❌ Next.js server is not running on port 3000!"
  echo "   Please start it with: npm run dev"
  exit 1
fi

echo "🚀 Processing embedding backlog..."
echo "📊 API endpoint: http://localhost:3000/api/process-embedding-queue"
echo ""

BATCH_NUM=0
TOTAL_PROCESSED=0
TOTAL_FAILED=0

while true; do
  BATCH_NUM=$((BATCH_NUM + 1))
  
  echo "🔄 Batch $BATCH_NUM..."
  
  # Call the API endpoint
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/process-embedding-queue \
    -H "x-api-key: $SYSTEM_API_KEY" \
    -H "Content-Type: application/json")
  
  # Extract processed count from JSON response
  PROCESSED=$(echo "$RESPONSE" | grep -o '"processed":[0-9]*' | grep -o '[0-9]*')
  FAILED=$(echo "$RESPONSE" | grep -o '"failed":[0-9]*' | grep -o '[0-9]*')
  MESSAGE=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
  
  if [ -z "$PROCESSED" ]; then
    # Check for error
    ERROR=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$ERROR" ]; then
      echo "   ❌ Error: $ERROR"
      echo "   Response: $RESPONSE"
      exit 1
    fi
    
    # Check if queue is empty
    if echo "$RESPONSE" | grep -q "No jobs in queue"; then
      echo "   ✅ Queue is empty!"
      break
    fi
    
    echo "   ⚠️  Unexpected response: $RESPONSE"
    break
  fi
  
  TOTAL_PROCESSED=$((TOTAL_PROCESSED + PROCESSED))
  TOTAL_FAILED=$((TOTAL_FAILED + ${FAILED:-0}))
  
  echo "   ✅ Processed: $PROCESSED, Failed: ${FAILED:-0}"
  echo "   📈 Total: $TOTAL_PROCESSED processed, $TOTAL_FAILED failed"
  
  # If processed 0, queue is empty
  if [ "$PROCESSED" -eq 0 ]; then
    echo "   ✅ Queue is empty!"
    break
  fi
  
  # Small delay between batches
  sleep 2
done

echo ""
echo "✅ Backlog processing complete!"
echo "📊 Final stats:"
echo "   - Batches processed: $BATCH_NUM"
echo "   - Total jobs processed: $TOTAL_PROCESSED"
echo "   - Total jobs failed: $TOTAL_FAILED"

