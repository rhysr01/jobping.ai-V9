# EMAIL UPGRADE DEVELOPER CHECKLIST

## PRE-WORK (10 minutes)
- [ ] Read DEVELOPER_README.md
- [ ] Read DEVELOPER_EMAIL_INSTRUCTIONS.md (Sections 1-2)
- [ ] Review productionReadyTemplates.ts (example code)
- [ ] Understand the problem: emails don't match website preview

---

## PHASE 1: IMPLEMENTATION (2-3 hours)

### Create New Template File
- [ ] Create `/Utils/email/productionReadyTemplates.ts`
- [ ] Add COLORS constant (purple gradients from website)
- [ ] Implement `createHeader()` with purple gradient + VML
- [ ] Implement `createHotMatchBadge()` for 90%+ scores
- [ ] Implement `createMatchScoreBadge()` with purple gradient
- [ ] Implement `createApplicationLinkBox()` with purple tint
- [ ] Implement `createFeedbackButton()` (5 buttons)
- [ ] Implement `createFeedbackSection()` (full layout)
- [ ] Implement `truncateDescription()` (smart sentence break)
- [ ] Implement `createJobCard()` (hot match logic)
- [ ] Implement `createFooter()` with purple branding
- [ ] Implement `createWelcomeEmail()` (complete HTML)
- [ ] Implement `createJobMatchesEmail()` (complete HTML)

### Verify Template Quality
- [ ] All styles are inline (no <style> tags)
- [ ] All layouts use tables (not divs)
- [ ] VML fallbacks for Outlook gradients
- [ ] Fallback colors for all gradients
- [ ] Web-safe fonts used
- [ ] Touch targets ≥ 44px height

---

## PHASE 2: FEATURE FLAG (30 minutes)

### Edit optimizedSender.ts
- [ ] Import both template versions (legacy + production)
- [ ] Add `shouldUseProductionTemplate(email)` function
- [ ] Add MD5 hash bucketing logic
- [ ] Update `sendWelcomeEmail()` to use feature flag
- [ ] Update `sendMatchedJobsEmail()` to use feature flag
- [ ] Add logging: which template used for each email
- [ ] Test locally that flag works (0%, 50%, 100%)

---

## PHASE 3: LOCAL TESTING (1 hour)

### Create Test Script
- [ ] Create `/scripts/test-email.ts`
- [ ] Add test job data (5 jobs, one with 92% score)
- [ ] Set `NEW_EMAIL_TEMPLATE_ROLLOUT=100`
- [ ] Add function to send to test email addresses

### Run Local Tests
- [ ] Run: `npx tsx scripts/test-email.ts`
- [ ] Email received in inbox
- [ ] Purple gradient header visible
- [ ] Hot match badge shows for 92% job
- [ ] Match score badges are purple
- [ ] All links clickable
- [ ] Feedback buttons large and visible
- [ ] Application link box shows with purple tint

---

## PHASE 4: EMAIL CLIENT TESTING (2-3 hours)

### Gmail Web (Desktop)
- [ ] Purple gradient header renders
- [ ] Hot match card has purple border
- [ ] Match score badges are purple gradient
- [ ] Job cards have correct spacing
- [ ] Feedback buttons all visible
- [ ] All links work
- [ ] Text readable

### Gmail Mobile (iOS/Android)
- [ ] Layout responsive
- [ ] Buttons tappable (≥44px)
- [ ] Text readable on small screen
- [ ] Purple colors visible
- [ ] No horizontal scrolling

### Outlook 2016/2019 (Windows)
- [ ] VML gradient renders in header
- [ ] Layout not broken
- [ ] Tables display correctly
- [ ] All text visible
- [ ] Links work

### Outlook.com (Web)
- [ ] Modern CSS works
- [ ] Gradients visible
- [ ] Layout intact

### Apple Mail (macOS/iOS)
- [ ] Full rendering support
- [ ] All styles work
- [ ] Animations smooth (if any)
- [ ] Retina images sharp

### Email Size Check
- [ ] Run: Check email HTML size
- [ ] Size < 100KB (Gmail clip threshold)
- [ ] If >100KB, minify HTML

---

## PHASE 5: DEPLOY (30 minutes)

### Set Up Environment
- [ ] Add env var: `NEW_EMAIL_TEMPLATE_ROLLOUT=0`
- [ ] Deploy to production
- [ ] Verify deployment successful
- [ ] Check logs for errors

### Test in Production (Your Email Only)
- [ ] Set `NEW_EMAIL_TEMPLATE_ROLLOUT=100` temporarily
- [ ] Trigger email to your own address
- [ ] Verify purple branding
- [ ] Set back to `NEW_EMAIL_TEMPLATE_ROLLOUT=0`

---

## PHASE 6: GRADUAL ROLLOUT (2 weeks)

### Day 1: 5% Rollout
- [ ] Set `NEW_EMAIL_TEMPLATE_ROLLOUT=5`
- [ ] Monitor logs for errors
- [ ] Note: ~X users on new template

### Day 2-3: Monitor 5%
- [ ] Check error logs daily
- [ ] Query open rates (SQL)
- [ ] Query click rates (SQL)
- [ ] Query unsubscribe rates (SQL)
- [ ] Compare to legacy template
- [ ] Any red flags? (No → proceed)

### Day 4: 25% Rollout
- [ ] Set `NEW_EMAIL_TEMPLATE_ROLLOUT=25`
- [ ] Monitor logs
- [ ] Note: ~X users on new template

### Day 5-7: Monitor 25%
- [ ] Check error logs daily
- [ ] Query metrics
- [ ] Compare to baseline
- [ ] Any red flags? (No → proceed)

### Day 8: 50% Rollout
- [ ] Set `NEW_EMAIL_TEMPLATE_ROLLOUT=50`
- [ ] Monitor logs
- [ ] Note: ~X users on new template

### Day 9-11: Monitor 50%
- [ ] Check error logs daily
- [ ] Query metrics
- [ ] Statistical significance achieved?
- [ ] Metrics stable or improved? (Yes → proceed)

### Day 12: 100% Rollout
- [ ] Set `NEW_EMAIL_TEMPLATE_ROLLOUT=100`
- [ ] Monitor logs closely
- [ ] All users on new template

### Day 13-19: Monitor 100%
- [ ] Check error logs daily
- [ ] Query final metrics
- [ ] Compare to legacy baseline
- [ ] Success criteria met? (Yes → proceed to cleanup)

---

## PHASE 7: CLEANUP (1 hour)

### Archive Old Files
- [ ] Create `/Utils/email/archived/` directory
- [ ] Move `brandConsistentTemplates.ts` to archived
- [ ] Move `templates.ts` to archived
- [ ] Move `optimizedTemplates.ts` to archived
- [ ] Git commit: "Archive legacy email templates"

### Update Exports
- [ ] Edit `/Utils/email/index.ts`
- [ ] Remove legacy template exports
- [ ] Add production template exports
- [ ] Test imports in other files still work

### Remove Feature Flag Code
- [ ] Edit `optimizedSender.ts`
- [ ] Remove `shouldUseProductionTemplate()` function
- [ ] Remove legacy template imports
- [ ] Always use production templates
- [ ] Remove feature flag checks
- [ ] Git commit: "Remove email template feature flag"

### Update Documentation
- [ ] Update README with new template info
- [ ] Document new template structure
- [ ] Note success metrics achieved

---

## SUCCESS CRITERIA VERIFICATION

### Code Quality ✅
- [ ] All files created
- [ ] All tests passing
- [ ] No console errors
- [ ] Email size < 100KB
- [ ] Works in all major clients

### Visual Quality ✅
- [ ] Emails match website preview
- [ ] Purple branding throughout
- [ ] Hot matches visually distinct
- [ ] Professional appearance

### Performance Metrics ✅
- [ ] Open rate: ≥ baseline (or +10-15%)
- [ ] Click rate: +20-25%
- [ ] Feedback rate: +30-40%
- [ ] Unsubscribe rate: ≤ baseline (or -5%)
- [ ] Error rate: <1%

---

## RED FLAGS (STOP & ROLLBACK IF YOU SEE)

- ❌ Open rate drops >10%
- ❌ Unsubscribe rate increases >50%
- ❌ Error rate >5%
- ❌ User complaints about rendering
- ❌ Emails not displaying in any major client

**If red flag detected**:
1. Set `NEW_EMAIL_TEMPLATE_ROLLOUT=0` immediately
2. Check logs for errors
3. Test manually in affected client
4. Fix issue
5. Restart rollout at 5%

---

## ROLLBACK PROCEDURE

### Immediate Rollback
```bash
vercel env rm NEW_EMAIL_TEMPLATE_ROLLOUT
vercel env add NEW_EMAIL_TEMPLATE_ROLLOUT
# Enter: 0
```

### Investigate
- [ ] Check Vercel logs: `vercel logs --since 1h`
- [ ] Check database for failed sends
- [ ] Test email manually
- [ ] Identify root cause

### Fix & Redeploy
- [ ] Fix issue in code
- [ ] Test locally
- [ ] Deploy to preview
- [ ] Test in preview
- [ ] Deploy to production
- [ ] Restart rollout at 5%

---

## COMPLETION CHECKLIST

- [ ] All 7 phases completed
- [ ] 100% rollout stable for 1 week
- [ ] Success criteria met
- [ ] Old files archived
- [ ] Feature flag removed
- [ ] Documentation updated
- [ ] Team notified of completion

---

**Estimated Total Time**: 2 weeks
- Implementation: 3-4 hours
- Testing: 3-4 hours  
- Monitoring: 5-10 mins/day for 2 weeks
- Cleanup: 1 hour

**Questions?** See DEVELOPER_EMAIL_INSTRUCTIONS.md

---

**Started**: ___/___/___
**Completed**: ___/___/___
**Total Time**: ______ hours
