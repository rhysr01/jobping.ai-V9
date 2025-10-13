# 🧹 ADDITIONAL CLEANUP OPPORTUNITIES

## 🟡 MEDIUM PRIORITY:

### **1. Temporary Documentation Files** (12 files, ~92KB)
```
CLEANUP-COMPLETE-SUMMARY.md        - Just created (keep for now)
DATABASE-AUDIT.md                  - Database analysis (archive?)
DEAD-CODE-AUDIT.md                 - Just created (keep for now)
DEVELOPER_CHECKLIST.md             - Onboarding doc (move to docs/?)
DEVELOPER_EMAIL_INSTRUCTIONS.md    - Email setup guide (move to docs/?)
EMAIL-BRANDING-STATUS.md           - Status report (archive?)
EMAIL_UPGRADE_PLAN.md              - Planning doc (archive?)
FEEDBACK-SYSTEM-STATUS.md          - Just created (keep for now)
FILES_FOR_DEVELOPER.md             - Reference doc (move to docs/?)
SUMMARY_FOR_RHYS.md                - Personal summary (archive?)
WEEK1-COMPLETION-SUMMARY.md        - Status report (archive?)
js-files.txt                       - Temp file (delete)
```

**Recommendation**: 
- Move useful docs to `docs/` directory
- Archive old status reports
- Delete temp files like `js-files.txt`

---

### **2. Temporary SQL Migration Files** (4 files)
```
add-performance-indexes.sql        - Already applied? (verify & delete)
cleanup-jobs-backup-table.sql      - One-time migration (delete if done)
cleanup-unused-tables.sql          - Already applied? (verify & delete)
fix-supabase-advisors.sql          - Already applied? (verify & delete)
```

**Recommendation**: 
- Check if these have been applied to production
- If yes, delete them (migrations are tracked in Supabase)
- If no, apply them then delete

---

### **3. Orphaned Test Files** (9 files, ~32KB)
```
tests/seo.spec.ts                  - Playwright test (no corresponding feature?)
tests/a11y.spec.ts                 - Accessibility test (no corresponding feature?)
tests/meta.spec.ts                 - Meta tags test (no corresponding feature?)
tests/share-preview.spec.ts        - Social preview test (no corresponding feature?)
tests/form-resilience.spec.ts      - Form test (no corresponding feature?)
tests/e2e/user-journey.spec.ts     - E2E test (outdated?)
tests/visual.spec.ts               - Visual regression test (no setup?)
__tests__/basic.test.ts            - Basic test (empty/placeholder?)
__tests__/performance/load.test.ts - Load test (16KB - check if used)
Utils/config/__tests__/matching.test.ts - Test for deleted config?
```

**Recommendation**: 
- Review each test file
- Delete if feature doesn't exist or test is outdated
- Keep if actively used in CI/CD

---

### **4. Build/Test Artifact Directories**
```
coverage/          - Test coverage reports (gitignored, but exists)
dist/              - Build output (check if used)
playwright-report/ - Test reports (gitignored, but exists)
test-results/      - Test results (gitignored, but exists)
```

**Recommendation**: 
- These are gitignored, so safe to delete locally
- Run: `rm -rf coverage/ dist/ playwright-report/ test-results/`
- They'll regenerate when needed

---

## 🟢 LOW PRIORITY:

### **5. lib/ Unused Exports** (from ts-prune)
```
lib/date-helpers.ts:
  - getDateHoursAgo, getDateMinutesAgo, toUTCString
  - isWithinDays, getStartOfToday, getEndOfToday

lib/copy.ts:
  - 20+ unused constants (CTA_FREE, HERO_TITLE, etc.)

lib/auth.ts:
  - validateProductionSecrets
  - validateEnvHygiene

lib/config.ts:
  - targetCities
```

**Recommendation**: 
- Keep for now (may be used in future features)
- Or comment with `// @deprecated - remove if not used by [date]`

---

### **6. Empty/Minimal Directories**
```
.lighthouseci/     - Lighthouse CI config (check if used)
__mocks__/         - Jest mocks (check if used)
docs/              - Documentation (check if empty)
```

**Recommendation**: 
- Check if these directories have content
- Delete if empty and not needed

---

## 📊 POTENTIAL CLEANUP IMPACT:

**If all medium priority items cleaned:**
- ~12 temporary docs → archive or move to docs/
- ~4 SQL files → delete after verification
- ~9 orphaned tests → delete if outdated
- ~4 build directories → safe to delete locally

**Total Reduction**: ~150KB of temporary files + cleaner repo structure

---

## 🎯 RECOMMENDED ACTION PLAN:

### **Quick Wins (5 minutes)**:
1. Delete build artifacts: `rm -rf coverage/ dist/ playwright-report/ test-results/`
2. Delete temp file: `rm js-files.txt`
3. Move recent summaries to docs/: `mkdir -p docs/summaries && mv *-SUMMARY.md docs/summaries/`

### **Medium Effort (15 minutes)**:
4. Review SQL files - delete if already applied
5. Review test files - delete if orphaned/outdated
6. Organize docs: move developer guides to `docs/guides/`

### **Low Priority (when time permits)**:
7. Clean up unused lib/ exports
8. Review and remove empty directories

---

## ❓ QUESTIONS FOR YOU:

1. **SQL files**: Have these been applied to production already?
2. **Test files**: Are you actively using Playwright/E2E tests?
3. **Docs**: Want me to organize these into a proper `docs/` structure?
4. **Build artifacts**: Safe to delete `coverage/`, `dist/`, etc.?

Let me know what you'd like to tackle! 🧹

