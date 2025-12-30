#!/bin/bash

# Run all JobSpy scrapers locally for job ingestion
# This allows you to ingest jobs while fixing GitHub Actions

echo "🚀 Running JobSpy scrapers locally..."
echo "======================================"
echo ""

# Set environment
export NODE_ENV=production

# Run main JobSpy scraper (early-career jobs)
echo "📡 Running JobSpy Main Scraper..."
node scripts/jobspy-save.cjs

echo ""
echo "======================================"
echo "✅ JobSpy Main Scraper Complete"
echo ""

# Run internships scraper
echo "🎓 Running JobSpy Internships Scraper..."
node scripts/jobspy-internships-only.cjs

echo ""
echo "======================================"
echo "✅ JobSpy Internships Scraper Complete"
echo ""

# Run career path roles scraper
echo "🎯 Running JobSpy Career Path Roles Scraper..."
node scripts/jobspy-career-path-roles.cjs

echo ""
echo "======================================"
echo "🎉 All JobSpy scrapers complete!"
echo ""

