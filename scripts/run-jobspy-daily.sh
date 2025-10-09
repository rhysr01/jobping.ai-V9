#!/bin/bash

# JOBSPY DAILY SCRAPER - Manual Execution
# Run this once per day to scrape LinkedIn, Indeed, and other sources
# Usage: ./scripts/run-jobspy-daily.sh

set -e

echo "🔍 JOBSPY DAILY SCRAPER"
echo "======================================"
echo "Started: $(date)"
echo ""

# Check if jobspy is installed
if ! command -v python-jobspy &> /dev/null; then
    echo "⚠️  JobSpy CLI not found. Installing via pip..."
    pip install python-jobspy
fi

echo "✅ JobSpy ready"
echo ""

# Run the jobspy save script
echo "🚀 Running JobSpy scraper..."
echo "   Sources: LinkedIn, Indeed, Glassdoor, ZipRecruiter"
echo "   Locations: EU cities"
echo "   Terms: Early-career roles"
echo ""

node scripts/jobspy-save.cjs

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ JOBSPY SCRAPING COMPLETE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Completed: $(date)"
    echo ""
    echo "📊 Check Supabase jobs table for new entries"
    echo "🔄 Run this script again tomorrow"
    echo ""
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ JOBSPY SCRAPING FAILED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Exit code: $EXIT_CODE"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Check .env.local has SUPABASE credentials"
    echo "   2. Verify jobspy is installed: pip list | grep jobspy"
    echo "   3. Check network connection"
    echo "   4. Review error logs above"
    echo ""
    exit $EXIT_CODE
fi

# Optional: Set up a cron job reminder
echo "💡 TIP: Set up a daily reminder to run this script"
echo "   Or add to cron: 0 9 * * * cd /path/to/jobping && ./scripts/run-jobspy-daily.sh"
echo ""

