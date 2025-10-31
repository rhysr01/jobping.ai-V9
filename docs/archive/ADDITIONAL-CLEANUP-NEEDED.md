# Additional Cleanup Needed

##  High Priority

### 1. Unused NPM Dependencies (12 packages)
**Impact**: Reduces bundle size, improves install time, security surface

```bash
# Unused dependencies to remove:
npm uninstall \
  @tailwindcss/postcss \
  bull \
  cheerio \
  cld3-asm \
  express \
  franc \
  hot-shots \
  p-queue \
  puppeteer \
  puppeteer-extra \
  puppeteer-extra-plugin-stealth \
  xml2js

# Unused devDependencies to remove:
npm uninstall -D \
  @axe-core/playwright \
  @eslint/eslintrc \
  @testing-library/jest-dom \
  @testing-library/react \
  autoprefixer \
  jest-environment-jsdom \
  postcss
```

**Why these are unused:**
- `puppeteer*`: Likely replaced by Playwright
- `bull`: Queue system not in use
- `cheerio`, `xml2js`: Web scraping libs not used
- `express`: Using Next.js API routes
- `franc`, `cld3-asm`: Language detection libs not used
- Testing libs: Seem to be replaced by other testing setup

### 2. Temporary Status Files (Should Delete)
```
CLEANUP-PUSH-SUCCESS.md          # Status file from previous cleanup
FULL-CLEANUP-COMPLETE.md         # Status file
REMOTE-UPDATED.md                # Status file
TEST-REFACTOR-ANALYSIS.md        # Analysis doc (archive or delete)
ADDITIONAL-CLEANUP-OPPORTUNITIES.md  # Old version of this file
package.json.backup-98-scripts   # Old backup file
```

**Recommendation**: Delete all except maybe keep one consolidated summary

### 3. ESLint Configuration Needed
The remaining 152 warnings need proper ESLint config:

```json
// .eslintrc.json additions
{
  "rules": {
    "no-unused-vars": ["warn", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_",
      "ignoreRestSiblings": true,
      "args": "after-used"
    }],
    "@typescript-eslint/no-unused-vars": ["warn", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_",
      "ignoreRestSiblings": true,
      "args": "after-used"
    }]
  },
  "overrides": [
    {
      "files": ["**/__mocks__/**/*"],
      "rules": {
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": "off"
      }
    }
  ]
}
```

##  Medium Priority

### 4. Duplicate Functionality Audit Needed
Files to review for duplication:

- `services/user-matching.service.ts` - New service, check if it duplicates existing logic
- Email sender files - We have `optimizedSender.ts` and `sender.ts` (one delegates to other)
- Matching services - Multiple files in `Utils/matching/` - are they all needed?

### 5. Test Coverage Gaps
Only **11 test files** found for a codebase of 167 source files (6.6% coverage)

**Critical paths needing tests:**
- `app/api/match-users/route.ts` (complex matching logic)
- `Utils/consolidatedMatching.ts` (core business logic)
- `Utils/email/optimizedSender.ts` (critical path)
- `services/user-matching.service.ts` (new code)

### 6. Documentation Cleanup
Multiple overlapping docs in `docs/summaries/`:
```
CLEANUP-COMPLETE-SUMMARY.md
DEAD-CODE-AUDIT.md
SUMMARY_FOR_RHYS.md
WEEK1-COMPLETION-SUMMARY.md
```

**Recommendation**: Consolidate into single current state doc

##  Low Priority

### 7. Code Patterns to Standardize

**Inconsistent error handling:**
- Some files use custom `errorResponse`
- Others use `NextResponse.json`
- Some use thrown errors
- **Recommendation**: Pick one pattern and standardize

**Inconsistent imports:**
- Some files use `@/Utils/`, others use relative paths
- **Recommendation**: Use path aliases consistently

### 8. API Route Improvements

**Unused parameters** in many API routes (from our scan):
- Most POST/GET handlers have unused `req` or `request` param
- **Recommendation**: Add `// @ts-expect-error` or use destructuring to mark as intentional

### 9. Type Safety Improvements

**Any types** found in multiple places:
```typescript
// services/user-matching.service.ts
users: any[]  // Should be User[]
match: any    // Should be Match
```

**Recommendation**: Replace `any` with proper types from `database.types.ts`

### 10. Environment Variable Validation

No runtime validation for required env vars.

**Recommendation**: Add startup validation:
```typescript
// lib/env-validation.ts
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  // ...
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required env var: ${varName}`);
  }
});
```

##  Checklist

### Immediate (< 1 hour)
- [ ] Remove unused npm dependencies
- [ ] Delete temporary status markdown files
- [ ] Update .eslintrc.json with proper rules
- [ ] Delete old backup files

### Short-term (< 1 day)
- [ ] Audit and consolidate duplicate services
- [ ] Fix remaining ESLint warnings (152 † ~50)
- [ ] Consolidate documentation
- [ ] Add environment variable validation

### Medium-term (< 1 week)
- [ ] Increase test coverage to 20%+
- [ ] Standardize error handling patterns
- [ ] Replace `any` types with proper types
- [ ] Standardize import paths

##  Quick Wins

**Commands you can run now:**

```bash
# 1. Remove unused dependencies (save ~50MB)
npm uninstall @tailwindcss/postcss bull cheerio cld3-asm express franc hot-shots p-queue puppeteer puppeteer-extra puppeteer-extra-plugin-stealth xml2js

# 2. Remove unused dev dependencies
npm uninstall -D @axe-core/playwright @eslint/eslintrc @testing-library/jest-dom @testing-library/react autoprefixer jest-environment-jsdom postcss

# 3. Clean up temporary files
rm CLEANUP-PUSH-SUCCESS.md FULL-CLEANUP-COMPLETE.md REMOTE-UPDATED.md TEST-REFACTOR-ANALYSIS.md ADDITIONAL-CLEANUP-OPPORTUNITIES.md package.json.backup-98-scripts

# 4. Run final lint
npm run lint

# 5. Check bundle size
npm run build
```

## ¯ Expected Impact

After full cleanup:
- **Bundle size**: -15-20% (remove unused deps)
- **Install time**: -30% faster
- **Lint warnings**: 152 † ~50 (mostly intentional)
- **Code duplication**: Reduced
- **Type safety**: Improved
- **Test coverage**: 6.6% † 20%+

##  Risks

**Low risk:**
- Removing unused dependencies (they're truly unused)
- Deleting status files (just documentation)
- ESLint config (warnings only)

**Medium risk:**
- Consolidating duplicate services (need careful review)
- Standardizing error patterns (need testing)

**High risk:**
- None identified

