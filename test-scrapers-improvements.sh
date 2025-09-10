#!/bin/bash

# Quick test script to verify improvements

echo "🧪 Testing Scraper Improvements"
echo "================================"
echo ""

# Test the improvements
node scripts/test-improvements.js

echo ""
echo "📊 Now testing actual scrapers with DRY_RUN mode..."
echo ""

# Test Adzuna scraper in dry run mode
echo "Testing Adzuna scraper..."
DRY_RUN=true FRESHNESS_DAYS=7 ADZUNA_MAX_CALLS=2 node scripts/populate-eu-jobs-minimal.js 2>&1 | head -50

echo ""
echo "Testing Reed scraper..."
DRY_RUN=true FRESHNESS_DAYS=7 node scripts/reed-real-scraper.js 2>&1 | head -50

echo ""
echo "✅ Tests complete. Check output above for any errors."
