#!/bin/bash

echo "🧹 JobPing Console.log Cleanup"
echo "=============================="

# Create backup
echo "📦 Creating backup..."
mkdir -p cleanup-backups
tar -czf cleanup-backups/before-console-cleanup-$(date +%Y%m%d-%H%M%S).tar.gz \
  --exclude=node_modules \
  --exclude=cleanup-backups \
  --exclude=cleanup-reports \
  .

# Files that should keep console.log for debugging (test/dev files)
KEEP_CONSOLE_FILES=(
  "**/test/**"
  "**/__tests__/**"
  "**/*.test.*"
  "**/*.spec.*"
  "jest.setup.js"
  "jest.config.js"
  "cleanup-scripts/**"
)

# Production files that need console.log for monitoring
MONITORING_FILES=(
  "Utils/productionRateLimiter.ts"
  "Utils/monitoring/**"
  "Utils/logging/**"
)

echo "🔍 Analyzing console.log statements..."

# Count current console.logs
TOTAL_CONSOLE=$(find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | xargs grep -c "console\.log" | awk '{sum += $1} END {print sum}')
echo "📊 Found $TOTAL_CONSOLE console.log statements"

# Identify high-priority files for cleanup (temporary/debug scripts)
echo "🎯 High-priority cleanup targets:"
grep -l "console\.log" cleanup-reports/console-logs.txt | grep -E "(multilingual|deletion|execute|analyze)" | head -10

# Create selective cleanup script
cat > cleanup-scripts/remove-debug-console-logs.sh << 'EOF'
#!/bin/bash

# Remove console.log from obvious debug/temporary files
echo "🗑️  Removing console.log from debug files..."

# Debug/analysis scripts (these are temporary anyway)
find . -name "*deletion*.js" -o -name "*analyze*.js" -o -name "*execute*.js" | \
  grep -v node_modules | \
  while read file; do
    if [[ -f "$file" ]]; then
      echo "   Cleaning $file"
      # Comment out console.log instead of removing (safer)
      sed -i.bak 's/^[[:space:]]*console\.log(/\/\/ console.log(/g' "$file"
    fi
  done

# Remove obvious debug console.logs from API routes
find app/api -name "*.ts" | \
  while read file; do
    # Only remove console.log statements that are obviously debug statements
    sed -i.bak '/console\.log.*debug\|console\.log.*DEBUG\|console\.log.*\[\w\+\]/s/^/\/\/ /' "$file"
  done

echo "✅ Debug console.log cleanup complete"
echo "📝 .bak files created for safety - remove after testing"
EOF

chmod +x cleanup-scripts/remove-debug-console-logs.sh

echo ""
echo "✅ Console.log cleanup script created!"
echo "🔧 Run './cleanup-scripts/remove-debug-console-logs.sh' to clean debug statements"
echo "⚠️  This will comment out (not delete) console.log statements for safety"
echo "📋 Review the changes before committing"
