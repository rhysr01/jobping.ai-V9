# Signup Flow Audit - Issues & Fixes 🔧
**Date:** January 13, 2026  
**Scope:** Free signup, Premium signup, Europe Map, Success pages  
**Status:** Critical issues identified

---

## 🚨 CRITICAL ISSUES FOUND

### **1. EUROPE MAP - City Label Overlap (Dublin & Belfast)**
**Location:** `components/ui/EuropeMap.tsx` lines 10-28

**Problem:**
```typescript
const OFFSET: Record<string, { dx: number; dy: number }> = {
	Dublin: { dx: 8, dy: -4 },
	Belfast: { dx: -12, dy: 6 },
};
```

When both Dublin and Belfast are selected, labels overlap because:
- Dublin offset: right 8px, up 4px
- Belfast offset: left 12px, down 6px
- They're only ~100km apart geographically
- On a 1000px wide map, that's ~20-30px separation
- Labels are ~60-80px wide → **OVERLAP**

**Current "Fix" Attempt:**
```typescript
// Lines 18-22
const OVERLAP_OFFSETS: Record<string, { dx: number; dy: number }> = {
	Belfast: { dx: -18, dy: 10 }, // Move Belfast further left and down
	Dublin: { dx: 14, dy: -8 }, // Move Dublin further right and up
};
```

**Why It Doesn't Work Well:**
- Hardcoded for Dublin/Belfast only
- Doesn't account for other nearby cities (London/Manchester, Milan/Zurich)
- Labels still visually crowd the map
- Mobile makes this worse (smaller viewport = tighter spacing)

---

### **RECOMMENDED FIX: Smart Label Collision Detection**

**Solution: Implement dynamic label positioning with collision avoidance**

```typescript
// Add this helper function to EuropeMap.tsx
const calculateLabelPositions = (
  selectedCities: string[],
  cityEntries: [string, ProjectedCity][]
): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>();
  const LABEL_WIDTH = 80; // Approximate label width
  const LABEL_HEIGHT = 24; // Approximate label height
  const MIN_SPACING = 8; // Minimum pixels between labels

  // Sort cities by Y coordinate (top to bottom) for consistent positioning
  const sortedCities = [...selectedCities].sort((a, b) => {
    const coordsA = cityEntries.find(([name]) => name === a)?.[1];
    const coordsB = cityEntries.find(([name]) => name === b)?.[1];
    return (coordsA?.y || 0) - (coordsB?.y || 0);
  });

  sortedCities.forEach((city) => {
    const coords = cityEntries.find(([name]) => name === city)?.[1];
    if (!coords) return;

    // Start with default position (above marker)
    let x = coords.x;
    let y = coords.y - 32;

    // Check for collisions with already-placed labels
    let hasCollision = true;
    let attempts = 0;
    const maxAttempts = 8; // Try up to 8 different positions

    while (hasCollision && attempts < maxAttempts) {
      hasCollision = false;

      // Check against all already-placed labels
      for (const [placedCity, placedPos] of positions.entries()) {
        const dx = Math.abs(x - placedPos.x);
        const dy = Math.abs(y - placedPos.y);

        // Check if rectangles overlap
        if (
          dx < (LABEL_WIDTH + MIN_SPACING) / 2 &&
          dy < (LABEL_HEIGHT + MIN_SPACING) / 2
        ) {
          hasCollision = true;
          break;
        }
      }

      if (hasCollision) {
        // Try different positions in priority order:
        // 1. Above (default)
        // 2. Below
        // 3. Left
        // 4. Right
        // 5. Top-left diagonal
        // 6. Top-right diagonal
        // 7. Bottom-left diagonal
        // 8. Bottom-right diagonal
        switch (attempts) {
          case 0:
            y = coords.y - 32; // Above (default)
            break;
          case 1:
            y = coords.y + 32; // Below
            break;
          case 2:
            x = coords.x - 50; // Left
            y = coords.y - 16;
            break;
          case 3:
            x = coords.x + 50; // Right
            y = coords.y - 16;
            break;
          case 4:
            x = coords.x - 40; // Top-left
            y = coords.y - 40;
            break;
          case 5:
            x = coords.x + 40; // Top-right
            y = coords.y - 40;
            break;
          case 6:
            x = coords.x - 40; // Bottom-left
            y = coords.y + 40;
            break;
          case 7:
            x = coords.x + 40; // Bottom-right
            y = coords.y + 40;
            break;
        }
        attempts++;
      }
    }

    positions.set(city, { x, y });
  });

  return positions;
};
```

**Replace the useMemo for selectedLabelPositions (lines 355-371) with:**
```typescript
const selectedLabelPositions = useMemo(() => {
  return calculateLabelPositions(selectedCities, cityEntries);
}, [selectedCities, cityEntries]);
```

**Impact:**
- ✅ Dynamically avoids all label collisions
- ✅ Works for any combination of cities
- ✅ Scales to mobile viewports
- ✅ Prioritizes clean positioning (above > below > sides)
- ⏱️ 30 min implementation time

---

### **2. FREE SIGNUP - "Local Matches" Success Page Issue**
**Location:** `app/signup/success/page.tsx`

**Problem:** Free tier users see premium-focused success page

**Current Flow:**
1. Free user completes signup
2. Gets redirected to `/signup/success?matches=5&email=...`
3. Sees `PremiumFeaturesSection` (❌ confusing for free users)
4. Sees `EmailStatusSection` (❌ free users don't get emails)
5. Sees `CustomScanSection` (❌ premium only feature)

**User Expectation:**
- Free users want to see their 5 matches **immediately**
- Not interested in premium upsell right away
- Expect: "Here are your matches" page

**Current Code Issue:**
```tsx
// This is the SAME success page for both free and premium
<PremiumFeaturesSection matchCount={matchCount} email={email} />
<EmailStatusSection ... /> {/* Confusing for free users who get no email */}
```

---

### **RECOMMENDED FIX: Separate Success Experiences**

**Option A: Detect tier and show different content (RECOMMENDED)**

Add tier detection to `useSignupSuccess`:
```typescript
// In hooks/useSignupSuccess.ts
const searchParams = useSearchParams();
const tier = searchParams.get('tier') || 'free'; // Default to free

return {
  // ... existing returns
  tier,
  isFree: tier === 'free',
  isPremium: tier === 'premium',
};
```

Update success page to conditional render:
```tsx
function SignupSuccessContent() {
  const { isFree, isPremium, ... } = useSignupSuccess();

  if (isFree) {
    return <FreeSuccessPage matchCount={matchCount} />;
  }

  return <PremiumSuccessPage ... />;
}
```

**Create new component: `components/signup-success/FreeSuccessPage.tsx`:**
```tsx
export function FreeSuccessPage({ matchCount }: { matchCount: number }) {
  return (
    <div className="min-h-screen bg-black text-white py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Hero - Your Matches Are Ready */}
        <motion.div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <CheckCircle className="w-16 h-16 text-emerald-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Your {matchCount} Matches Are Ready!
          </h1>
          <p className="text-xl text-zinc-400">
            Check your email - we've sent your personalized job matches
          </p>
        </motion.div>

        {/* Job Matches Preview */}
        <JobMatchesPreview userId={userId} />

        {/* Soft Upsell (After showing value) */}
        <div className="mt-16 p-8 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5">
          <h3 className="text-2xl font-bold mb-4">Want 3× more matches every week?</h3>
          <p className="text-zinc-400 mb-6">
            Premium users get 15 curated matches delivered Mon/Wed/Fri
          </p>
          <Button href="/signup?tier=premium">
            Upgrade to Premium - €5/month →
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Impact:**
- ✅ Free users see immediate value (their matches)
- ✅ Clear separation between free and premium experiences
- ✅ Better conversion path (show value → upsell)
- ⏱️ 2 hours implementation time

---

### **3. PREMIUM SIGNUP - Email Issues**
**Problem:** Need more details from you

**Questions to answer:**
1. Are premium users getting their welcome emails?
2. Are matches being delivered Mon/Wed/Fri?
3. What error messages are you seeing?
4. Check `/api/send-emails` logs - any failures?

**Likely Issues:**
- Email template rendering incorrectly
- Resend API rate limits
- GDPR/unsubscribe links broken
- Timezone issues (UTC vs user timezone for delivery)

**Debug Steps:**
1. Check Resend dashboard for delivery status
2. Test email sending manually: `curl -X POST /api/send-emails`
3. Check Supabase `email_delivery` table for failed sends
4. Verify cron job is running: `/api/cron/daily-scrape`

---

## 🎯 PRIORITY FIXES

### **Do Today (High Impact, Low Effort)**

1. **✅ Fix Europe Map Label Overlap** (30 min)
   - Implement smart collision detection
   - Test with Dublin+Belfast, London+Manchester
   - Verify on mobile viewport

2. **✅ Separate Free/Premium Success Pages** (2 hours)
   - Create FreeSuccessPage component
   - Show actual job matches to free users
   - Add soft upsell after showing value

### **Do This Week (High Impact, Medium Effort)**

3. **Debug Premium Email Issues** (depends on findings)
   - Check Resend logs
   - Test email delivery
   - Fix any template/sending issues

4. **Improve Map Mobile UX** (1 hour)
   - Make city markers bigger on mobile (currently 9.5px)
   - Increase touch targets to 48px minimum
   - Test on iPhone SE (smallest modern viewport)

### **Nice-to-Have (Low Priority)**

5. **Add Map Search** (3 hours)
   - Searchable city list for mobile users
   - Keyboard shortcuts for desktop
   - "Find my city" button

6. **Map Performance** (2 hours)
   - Lazy load map on scroll
   - Reduce animation complexity
   - Add loading skeleton

---

## 📝 ADDITIONAL OBSERVATIONS

### **What's Working Well:**

1. **✅ Free Signup Flow**
   - Clear 60-second promise
   - Good progress indicator
   - Live job matching is engaging

2. **✅ Premium Signup Steps**
   - 4-step wizard is logical
   - Good validation feedback
   - Form persistence works

3. **✅ Map Interactivity**
   - Smooth animations
   - Good hover states
   - Accessible (keyboard navigation works)

### **Minor Issues (Don't Fix Now):**

1. **City Chips on Mobile** - Horizontal scroll works but could be grid
2. **Progress Bar** - Could show step names, not just numbers
3. **Loading States** - Some sections lack skeletons
4. **Error Messages** - Generic, could be more helpful

---

## 🚀 NEXT STEPS

**For You:**
1. Tell me more about the premium email issues:
   - What's not working?
   - Error messages?
   - When did it start?

2. Test the free success page:
   - Do free users see matches after signup?
   - Or just a generic success message?

3. Priority: Fix Europe map labels first (quick win, high impact)

**For Me:**
1. Implement smart label collision detection
2. Create separate free/premium success pages
3. Debug email issues once you provide details

---

**Want me to implement the map fix now? Or need me to investigate the email issues first?**
