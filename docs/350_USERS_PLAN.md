# 350 Users This Month - Essential Fixes Plan

**Goal**: Support 350 active users with reliable matching and email delivery

**Timeline**: Week 1 (Critical fixes only)

---

## Critical Issues Blocking Growth

### 1. ✅ User Capacity Limit (5 min)
**Current**: `userCap: 300` in `Utils/config/matching.ts`
**Fix**: Increase to 400 (buffer for growth)
**Impact**: Can process 350+ users per batch

### 2. ✅ Zero Matches Issue (30 min)
**Current**: Pre-filter thresholds too strict (50/45/40/35)
**Fix**: Lower by 10-15 points (40/35/30/25)
**Impact**: Prevents zero-match scenarios that cause churn

### 3. ✅ Entry Level Preference Parsing (15 min)
**Current**: Form stores "Internship, Graduate Programmes" but code checks lowercase
**Fix**: Normalize form values before matching
**Impact**: Better matching for internship/graduate roles

### 4. ⚠️ Scraper Health (2-4 hours)
**Current**: Adzuna & Reed stale (23 days), but JobSpy working
**Priority**: LOW (JobSpy provides enough jobs for 350 users)
**Action**: Monitor, fix if JobSpy fails
**Impact**: Job supply sufficient with JobSpy alone

### 5. ✅ Basic Health Monitoring (30 min)
**Fix**: Add scraper health check endpoint
**Impact**: Early detection of issues

---

## Implementation Priority

### Phase 1: Immediate (Today - 1 hour)
1. Increase userCap to 400
2. Lower pre-filter thresholds
3. Fix entry level preference parsing

### Phase 2: This Week (2-4 hours)
4. Add scraper health monitoring
5. Test with 350 users (dry run)
6. Verify email delivery capacity

### Phase 3: Monitor (Ongoing)
7. Watch for zero-match alerts
8. Monitor scraper health
9. Track user engagement

---

## Success Metrics

- ✅ Zero-match rate < 1%
- ✅ All users get 5+ matches per email
- ✅ Email delivery success rate > 99%
- ✅ Matching completes in <2s per user
- ✅ Scraper health: JobSpy running <7 days stale

---

## What We're NOT Doing (Out of Scope)

- ❌ Fixing Adzuna/Reed scrapers (JobSpy sufficient)
- ❌ Adding new cities (current coverage sufficient)
- ❌ Enabling semantic search (not critical)
- ❌ Performance optimizations (current speed OK)
- ❌ New features (focus on reliability)

---

## Risk Assessment

**Low Risk**: 
- UserCap increase (simple config change)
- Pre-filter threshold reduction (already has fallback)

**Medium Risk**:
- Entry level parsing (needs testing)
- Scraper monitoring (new code)

**Mitigation**: 
- Test changes in staging first
- Monitor Sentry for errors
- Keep fallback mechanisms active

