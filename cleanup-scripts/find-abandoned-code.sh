#!/bin/bash

echo "🔍 JobPing Abandoned Code Detection"
echo "==================================="

# Create output directory
mkdir -p cleanup-reports

# Find TODO/FIXME comments
echo "📝 Finding TODO/FIXME comments..."
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
  | grep -v node_modules \
  | grep -v cleanup-reports \
  | xargs grep -n "TODO\|FIXME\|BUG\|HACK\|XXX" > cleanup-reports/todos.txt 2>/dev/null
TODO_COUNT=$(wc -l < cleanup-reports/todos.txt 2>/dev/null || echo "0")
echo "   Found $TODO_COUNT TODO/FIXME comments"

# Find console.log statements
echo "🐛 Finding console.log statements..."
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
  | grep -v node_modules \
  | grep -v cleanup-reports \
  | xargs grep -n "console\.log" > cleanup-reports/console-logs.txt 2>/dev/null
CONSOLE_COUNT=$(wc -l < cleanup-reports/console-logs.txt 2>/dev/null || echo "0")
echo "   Found $CONSOLE_COUNT console.log statements"

# Find commented-out imports
echo "📦 Finding commented-out imports..."
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
  | grep -v node_modules \
  | grep -v cleanup-reports \
  | xargs grep -n "^[[:space:]]*//.*import\|^[[:space:]]*//.*require" > cleanup-reports/commented-imports.txt 2>/dev/null
IMPORT_COUNT=$(wc -l < cleanup-reports/commented-imports.txt 2>/dev/null || echo "0")
echo "   Found $IMPORT_COUNT commented-out imports"

# Find empty functions
echo "🔧 Finding empty functions..."
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
  | grep -v node_modules \
  | grep -v cleanup-reports \
  | xargs grep -n "function.*{[[:space:]]*}$\|const.*=.*{[[:space:]]*}$" > cleanup-reports/empty-functions.txt 2>/dev/null
EMPTY_COUNT=$(wc -l < cleanup-reports/empty-functions.txt 2>/dev/null || echo "0")
echo "   Found $EMPTY_COUNT potentially empty functions"

# Find duplicate function names
echo "🔄 Finding potential duplicate functions..."
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
  | grep -v node_modules \
  | grep -v cleanup-reports \
  | xargs grep -h "export.*function\|function.*(" \
  | sed 's/.*function \([^(]*\).*/\1/' \
  | sort | uniq -d > cleanup-reports/duplicate-functions.txt 2>/dev/null
DUPLICATE_COUNT=$(wc -l < cleanup-reports/duplicate-functions.txt 2>/dev/null || echo "0")
echo "   Found $DUPLICATE_COUNT potentially duplicate function names"

# Find large files (potential technical debt)
echo "📊 Finding largest files..."
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
  | grep -v node_modules \
  | grep -v cleanup-reports \
  | xargs wc -l | sort -rn | head -20 > cleanup-reports/largest-files.txt
echo "   Top 20 largest files saved to cleanup-reports/largest-files.txt"

# Generate summary report
echo "📋 Generating summary report..."
cat > cleanup-reports/summary.md << EOF
# JobPing Abandoned Code Report
Generated: $(date)

## Summary Statistics
- TODO/FIXME comments: $TODO_COUNT
- console.log statements: $CONSOLE_COUNT  
- Commented-out imports: $IMPORT_COUNT
- Empty functions: $EMPTY_COUNT
- Duplicate function names: $DUPLICATE_COUNT

## Priority Actions
1. Review largest files for technical debt
2. Clean up console.log statements
3. Remove commented-out imports
4. Address TODO comments

## Files Generated
- \`todos.txt\` - All TODO/FIXME comments
- \`console-logs.txt\` - All console.log statements
- \`commented-imports.txt\` - Commented-out imports
- \`empty-functions.txt\` - Potentially empty functions
- \`duplicate-functions.txt\` - Duplicate function names
- \`largest-files.txt\` - 20 largest files

EOF

echo ""
echo "✅ Report generated in cleanup-reports/"
echo "📋 Check cleanup-reports/summary.md for overview"

# Display summary
cat cleanup-reports/summary.md
