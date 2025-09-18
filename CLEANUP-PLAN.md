# JobPing Abandoned Code Cleanup Plan

## Overview
Systematic cleanup of abandoned code, unused imports, and technical debt across the entire JobPing codebase.

## Phase 1: Automated Detection & Cleanup Scripts

### 1.1 Create Cleanup Detection Scripts
```bash
# Find unused imports across TypeScript files
npx ts-unused-exports ./tsconfig.json

# Find TODO/FIXME comments
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -n "TODO\|FIXME\|BUG\|HACK\|XXX" > TODO-LIST.txt

# Find console.log statements
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -n "console\.log" > CONSOLE-LOGS.txt

# Find commented-out code
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -n "^[[:space:]]*//.*function\|^[[:space:]]*//.*const\|^[[:space:]]*//.*import" > COMMENTED-CODE.txt
```

### 1.2 ESLint Rules for Ongoing Cleanup
Add to `.eslintrc.js`:
```javascript
{
  "rules": {
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-debugger": "error",
    "@typescript-eslint/no-unused-imports": "error"
  }
}
```

## Phase 2: Priority Files for Manual Review

### 2.1 Large Files (Potential Technical Debt)
- `scrapers/Utils/jobMatching.js` (2,519 lines) - ✅ Clean
- `Utils/consolidatedMatching.ts` (868 lines) - ✅ Clean  
- `app/api/match-users/route.ts` (825 lines) - ✅ Recently cleaned
- `Utils/productionRateLimiter.ts` (724 lines) - ✅ Clean
- `app/api/webhook-tally/route.ts` (630 lines) - ✅ Clean

### 2.2 API Routes to Review
```bash
find app/api -name "*.ts" | head -10
```

### 2.3 Components to Review  
```bash
find app/components -name "*.tsx" | head -10
```

### 2.4 Utilities to Review
```bash
find Utils -name "*.ts" | head -15
```

## Phase 3: Specific Cleanup Tasks

### 3.1 Remove Debug/Development Code
- [ ] Remove all `console.log` statements not needed for production
- [ ] Remove commented-out experiments
- [ ] Remove test console outputs

### 3.2 Import Cleanup
- [ ] Remove unused imports across all files
- [ ] Consolidate duplicate imports
- [ ] Remove circular dependencies

### 3.3 Function/Variable Cleanup
- [ ] Remove unused functions
- [ ] Remove unused constants/variables
- [ ] Remove dead conditional branches

### 3.4 Comment Cleanup
- [ ] Remove TODO comments for completed features
- [ ] Update or remove outdated comments
- [ ] Remove commented-out code blocks

## Phase 4: Automation Scripts

### 4.1 Daily Cleanup Script
```bash
#!/bin/bash
# daily-cleanup.sh
echo "🧹 Running daily code cleanup..."

# Remove obvious temporary files
find . -name "*.tmp" -delete
find . -name "*.bak" -delete

# Check for new console.logs
CONSOLE_COUNT=$(find . -name "*.ts" -o -name "*.tsx" | xargs grep -c "console\.log" | awk '{sum += $1} END {print sum}')
echo "📊 Current console.log count: $CONSOLE_COUNT"

# Run linter
npm run lint

echo "✅ Daily cleanup complete"
```

### 4.2 Pre-commit Hooks
Add to `package.json`:
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

## Phase 5: Documentation & Prevention

### 5.1 Code Review Guidelines
- No console.log in production code
- Remove unused imports before commits
- Update comments when changing functionality
- Delete TODO comments when tasks are done

### 5.2 Regular Maintenance Schedule
- Weekly: Run cleanup detection scripts
- Monthly: Review large files for technical debt
- Quarterly: Deep cleanup of entire codebase

## Tools & Commands Reference

### Quick Cleanup Commands
```bash
# Find largest files
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs wc -l | sort -rn | head -20

# Count lines of code
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs wc -l | tail -1

# Find duplicate function names
grep -r "function\|const.*=" --include="*.ts" --include="*.tsx" | cut -d: -f2 | sort | uniq -d

# Find files with no exports (potential dead files)
find . -name "*.ts" -o -name "*.tsx" | xargs grep -L "export"
```

### VSCode Extensions for Cleanup
- TypeScript Hero (for import organization)
- ESLint (for code quality)
- Prettier (for formatting)
- Auto Import - ES6, TS, JSX, TSX
- Remove Comments extension

## Next Steps

1. ✅ **You already cleaned up `app/api/match-users/route.ts`** - Excellent start!
2. 🎯 **Run the detection scripts** to find actual problem areas
3. 🔧 **Set up ESLint rules** to prevent future accumulation
4. 📅 **Schedule regular cleanup sessions** (15 minutes weekly)

## Metrics to Track
- Lines of code count
- Number of console.log statements  
- Number of TODO comments
- Linting errors/warnings
- File count and average file size
