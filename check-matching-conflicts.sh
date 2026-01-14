#!/bin/bash

echo "🔍 JobPing Matching Conflict Analysis"
echo "====================================="
echo ""

echo "1. Does PREMIUM use matching engine?"
grep -n "simplifiedMatchingEngine\|findMatchesForUser" ./app/api/signup/route.ts | head -3

echo ""
echo "2. Does FREE use matching engine?"
grep -n "simplifiedMatchingEngine\|findMatchesForUser" ./app/api/signup/free/route.ts | head -3

echo ""
echo "3. Matching Engine Usage Summary:"
echo "PREMIUM route calls: $(grep -c "simplifiedMatchingEngine.findMatchesForUser" ./app/api/signup/route.ts)"
echo "FREE route calls: $(grep -c "simplifiedMatchingEngine.findMatchesForUser" ./app/api/signup/free/route.ts)"

echo ""
echo "4. Code Duplication Check:"
echo "Lines in premium route: $(wc -l < ./app/api/signup/route.ts)"
echo "Lines in free route: $(wc -l < ./app/api/signup/free/route.ts)"

echo ""
echo "5. Shared Import Check:"
echo "Both routes import simplifiedMatchingEngine: $(grep -c "simplifiedMatchingEngine" ./app/api/signup/route.ts ./app/api/signup/free/route.ts | grep -c ":1$")"

echo ""
echo "6. Race Condition Risk Assessment:"
echo "Both routes can run simultaneously and write to same 'matches' table"
echo "Winner-takes-all scenario - whichever completes first wins"
echo "No coordination between premium/free signup processes"

echo ""
echo "7. Maintenance Risk:"
echo "Any bug fix in one route needs to be manually applied to other"
echo "No single source of truth for matching logic"
echo "Different configurations (AI enabled vs disabled) scattered across files"

echo ""
echo "8. Recommendation:"
echo "✅ CONSOLIDATE: Create shared matching service with different configs"
echo "✅ PREVENT: Add user state locking to prevent concurrent signups"
echo "✅ MONITOR: Add logging to detect and alert on concurrent matching attempts"