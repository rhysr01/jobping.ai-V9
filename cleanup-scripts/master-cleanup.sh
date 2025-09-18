#!/bin/bash

echo "🚀 JobPing Master Cleanup Script"
echo "================================="
echo "Found via analysis:"
echo "  📝 53 TODO/FIXME comments"
echo "  🐛 2,110 console.log statements"  
echo "  📦 52 commented-out imports"
echo "  🔄 152 duplicate function names"
echo ""

# Create comprehensive backup
echo "📦 Creating comprehensive backup..."
mkdir -p cleanup-backups
BACKUP_NAME="master-cleanup-backup-$(date +%Y%m%d-%H%M%S)"
tar -czf cleanup-backups/$BACKUP_NAME.tar.gz \
  --exclude=node_modules \
  --exclude=cleanup-backups \
  --exclude=cleanup-reports \
  --exclude="*.log" \
  .
echo "✅ Backup created: cleanup-backups/$BACKUP_NAME.tar.gz"

# Interactive menu
while true; do
  echo ""
  echo "🎯 Choose cleanup action:"
  echo "1. 🔍 Re-run analysis (find current issues)"
  echo "2. 📦 Clean commented imports (52 found)"
  echo "3. 🐛 Clean debug console.log statements" 
  echo "4. 📝 Review TODO comments"
  echo "5. 📊 Show file size statistics"
  echo "6. 🔧 Run ESLint fix"
  echo "7. 🧪 Run tests after cleanup"
  echo "8. 📋 Generate cleanup report"
  echo "0. ✅ Exit"
  echo ""
  read -p "Enter choice (0-8): " choice

  case $choice in
    1)
      echo "🔍 Re-running analysis..."
      ./cleanup-scripts/find-abandoned-code.sh
      ;;
    2)
      echo "📦 Cleaning commented imports..."
      chmod +x cleanup-scripts/clean-commented-imports.sh
      ./cleanup-scripts/clean-commented-imports.sh
      ;;
    3)
      echo "🐛 Cleaning console.log statements..."
      chmod +x cleanup-scripts/clean-console-logs.sh
      ./cleanup-scripts/clean-console-logs.sh
      ;;
    4)
      echo "📝 Showing TODO comments..."
      if [[ -f cleanup-reports/todos.txt ]]; then
        echo "📋 Found TODOs:"
        head -20 cleanup-reports/todos.txt
        echo ""
        echo "💡 TIP: Review each TODO to see if it's completed or still needed"
      else
        echo "❌ No TODO report found. Run analysis first (option 1)"
      fi
      ;;
    5)
      echo "📊 File size statistics..."
      if [[ -f cleanup-reports/largest-files.txt ]]; then
        echo "📋 Largest files:"
        head -15 cleanup-reports/largest-files.txt
      else
        echo "❌ No size report found. Run analysis first (option 1)"
      fi
      ;;
    6)
      echo "🔧 Running ESLint fix..."
      if command -v npm &> /dev/null; then
        npm run lint --fix 2>/dev/null || echo "⚠️  ESLint not configured or errored"
      else
        echo "❌ npm not found"
      fi
      ;;
    7)
      echo "🧪 Running tests..."
      if command -v npm &> /dev/null; then
        npm test 2>/dev/null || echo "⚠️  Tests not configured or failed"
      else
        echo "❌ npm not found"
      fi
      ;;
    8)
      echo "📋 Generating cleanup report..."
      cat > CLEANUP-SUMMARY.md << EOF
# JobPing Cleanup Summary
Generated: $(date)

## Automated Analysis Results
$(cat cleanup-reports/summary.md)

## Actions Taken
- [ ] Cleaned commented imports
- [ ] Removed debug console.log statements  
- [ ] Reviewed TODO comments
- [ ] Ran ESLint fixes
- [ ] Verified tests still pass

## Recommendations
1. **Set up pre-commit hooks** to prevent console.log in production code
2. **Regular cleanup schedule** - run analysis monthly
3. **ESLint rules** to catch unused imports automatically
4. **Code review checklist** to include cleanup verification

## Files Modified
(List will be populated as you run cleanup actions)

## Backup Location
- \`cleanup-backups/$BACKUP_NAME.tar.gz\`

## Next Steps
1. Test the application thoroughly
2. Commit changes in logical chunks
3. Set up automated cleanup CI checks
EOF
      echo "✅ Report saved to CLEANUP-SUMMARY.md"
      ;;
    0)
      echo "✅ Cleanup session complete!"
      echo ""
      echo "📋 Summary:"
      echo "  - Backup created: cleanup-backups/$BACKUP_NAME.tar.gz"
      echo "  - Reports available in: cleanup-reports/"
      echo "  - Individual cleanup scripts available in: cleanup-scripts/"
      echo ""
      echo "💡 Next steps:"
      echo "  1. Test your application"
      echo "  2. Review and commit changes"
      echo "  3. Set up automated cleanup checks"
      break
      ;;
    *)
      echo "❌ Invalid choice. Please enter 0-8."
      ;;
  esac
done
