#!/bin/bash

# Monitor JobSpy Fix - Check if the fetch failed fix is working
# Usage: ./scripts/monitor-jobspy-fix.sh

echo "🔍 Monitoring JobSpy Fix Status..."
echo "=================================="
echo ""

# Check if we can connect to Supabase
echo "1️⃣ Checking Supabase connection..."
if [ -z "$SUPABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "   ⚠️  SUPABASE_URL not set, loading from .env.local..."
    if [ -f .env.local ]; then
        export $(grep -v '^#' .env.local | xargs)
    fi
fi

# Check recent JobSpy jobs in database
echo ""
echo "2️⃣ Checking recent JobSpy jobs in database..."
echo "   (Last 2 hours)"

# Use Node.js to query database
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!url || !key) {
  console.log('   ❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

(async () => {
  const { data, error } = await supabase
    .from('jobs')
    .select('source, created_at')
    .in('source', ['jobspy-indeed', 'jobspy-internships', 'jobspy-career-roles'])
    .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.log('   ❌ Database error:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('   ⚠️  No JobSpy jobs found in last 2 hours');
    console.log('   💡 This could mean:');
    console.log('      - No scraper run yet');
    console.log('      - Jobs still failing to save');
    console.log('      - Check GitHub Actions logs');
  } else {
    const bySource = {};
    data.forEach(job => {
      bySource[job.source] = (bySource[job.source] || 0) + 1;
    });

    console.log('   ✅ Found JobSpy jobs:');
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(\`      - \${source}: \${count} jobs\`);
    });
    
    const latest = new Date(data[0].created_at);
    const hoursAgo = (Date.now() - latest.getTime()) / (1000 * 60 * 60);
    console.log(\`   📅 Latest job: \${hoursAgo.toFixed(1)} hours ago\`);
    
    if (hoursAgo < 1) {
      console.log('   ✅ Jobs are being saved successfully!');
    } else {
      console.log('   ⚠️  No recent jobs - check if scraper ran');
    }
  }
})();
"

echo ""
echo "3️⃣ Checking GitHub Actions status..."
echo "   💡 To check GitHub Actions runs:"
echo "      - Visit: https://github.com/YOUR_REPO/actions"
echo "      - Look for 'Automated Job Scraping' workflow"
echo "      - Check latest run logs for:"
echo "        ✅ 'Saved X jobs' messages"
echo "        📊 'Save summary' at end"
echo "        ⚠️  'Network error' retry messages"

echo ""
echo "4️⃣ What to look for in logs:"
echo ""
echo "   ✅ SUCCESS INDICATORS:"
echo "      - '✅ Saved X jobs (batch Y)'"
echo "      - '📊 Save summary: X saved, 0 failed'"
echo ""
echo "   ⚠️  RETRY INDICATORS (Normal):"
echo "      - '⚠️ Network error (attempt X/3), retrying...'"
echo "      - Then: '✅ Saved X jobs' after retry"
echo ""
echo "   ❌ FAILURE INDICATORS:"
echo "      - '❌ Fatal upsert error after retries'"
echo "      - '📊 Save summary: 0 saved, X failed'"
echo ""

echo "=================================="
echo "✅ Monitoring check complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Wait for next GitHub Actions run (every 4 hours)"
echo "   2. Check logs for success/failure indicators above"
echo "   3. Run this script again to verify jobs were saved"

