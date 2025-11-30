# Design Audit Report
**Date:** 2025-01-28  
**Scope:** Visual consistency, design system adherence, component patterns

---

## 🔴 CRITICAL ISSUES

### 1. Border Radius Inconsistency
**Issue:** Cards use different border radius values across components.

**Current State:**
- Hero card: `rounded-xl` ✅
- Pricing cards: `rounded-xl` ✅
- HowItWorks cards: `rounded-xl` ✅
- BuiltForStudents cards: `rounded-2xl` ❌
- SocialProofRow cards: `rounded-2xl` ❌
- SocialProofRow container: `rounded-3xl` ✅ (acceptable for container)

**Fix:** Standardize all main content cards to `rounded-xl`. BuiltForStudents and SocialProofRow cards should use `rounded-xl`.

---

### 2. Background Color Inconsistency
**Issue:** Cards use different background opacity/colors.

**Current State:**
- Hero card: `bg-white/[0.08]` ✅
- Pricing free card: `bg-white/[0.06]` ✅
- Pricing premium card: `bg-zinc-900` ✅ (intentional for emphasis)
- HowItWorks cards: `bg-white/[0.06]` ✅
- BuiltForStudents cards: `bg-zinc-950/70` ❌
- SocialProofRow cards: `bg-zinc-950/80` ❌
- SecondaryCTA: `bg-zinc-900/90` ❌
- Pricing final CTA: `bg-zinc-900/90` ❌

**Fix:** Standardize to `bg-white/[0.06]` for standard cards. Keep premium card as `bg-zinc-900` for visual hierarchy.

---

### 3. Border Opacity Inconsistency
**Issue:** Border opacity varies across components.

**Current State:**
- Most cards: `border-white/10` ✅
- BuiltForStudents: `border-white/5` ❌
- SecondaryCTA: `border-white/8` ❌
- Pricing final CTA: `border-white/8` ❌
- Premium card: `border-violet-500/60` ✅ (intentional)

**Fix:** Standardize to `border-white/10` for standard cards.

---

### 4. Shadow System Inconsistency
**Issue:** Different shadow utilities used inconsistently.

**Current State:**
- Hero: `shadow-hero` ✅
- Pricing free: `shadow-pricing` ✅
- HowItWorks: `shadow-feature` ✅
- BuiltForStudents: Custom `shadow-[0_18px_40px_rgba(0,0,0,0.65)]` ❌
- SocialProofRow: Custom shadow ❌
- SecondaryCTA: Custom `shadow-[0_4px_20px_rgba(0,0,0,0.35)]` ❌
- Pricing final CTA: Custom `shadow-[0_4px_18px_rgba(0,0,0,0.35)]` ❌

**Fix:** Use utility classes (`shadow-hero`, `shadow-feature`, `shadow-pricing`) consistently. BuiltForStudents should use `shadow-feature`.

---

### 5. Padding Inconsistency
**Issue:** Card padding varies significantly.

**Current State:**
- Hero: `px-6 md:px-8 lg:px-12 py-10 md:py-12`
- Pricing: `px-6 py-6 md:px-7 md:py-7`
- HowItWorks: `px-6 py-6 md:px-7 md:py-7`
- BuiltForStudents: `p-5 md:p-6`
- SocialProofRow: `px-6 py-6 md:px-7 md:py-7`
- SecondaryCTA: `px-6 py-10 md:px-10 md:py-12`
- Pricing final CTA: `px-6 py-6 sm:px-8 sm:py-8 md:px-12 md:py-12`

**Fix:** Standardize to `px-6 py-6 md:px-7 md:py-7` for standard cards. Hero and CTAs can have larger padding.

---

## 🟡 MEDIUM PRIORITY ISSUES

### 6. Pill Label Inconsistency
**Issue:** Pill labels have slight variations.

**Current State:**
- Most pills: `px-4 py-1 text-[11px] tracking-[0.16em]` ✅
- Pricing final CTA: `px-4 py-1.5 text-xs tracking-[0.28em]` ❌
- HowItWorks "Updated daily": `px-4 py-1.5 text-xs tracking-[0.24em]` + emerald colors ❌

**Fix:** Standardize all pills to `px-4 py-1 text-[11px] font-medium tracking-[0.16em] uppercase text-violet-200`. Keep "Updated daily" badge but align sizing.

---

### 7. Section Band Inconsistency
**Issue:** Section bands use different gradients.

**Current State:**
- SocialProofRow: `from-zinc-900/40`
- Pricing: `from-indigo-900/40`
- HowItWorks: `from-zinc-900/40`
- BuiltForStudents: `from-zinc-900/40`
- EmailPhoneShowcase: `from-indigo-900/40`
- SecondaryCTA: `from-zinc-900/50`

**Fix:** Standardize to `from-zinc-900/40` for consistency. Pricing and EmailPhoneShowcase can keep `from-indigo-900/40` if intentional.

---

### 8. New Pages Missing Design Elements
**Issue:** About, Pricing, and Contact pages lack section bands and scroll momentum fades.

**Current State:**
- Landing page sections: Have scroll momentum fade + section band ✅
- About page: No section band, no scroll fade ❌
- Pricing page: No section band, no scroll fade ❌
- Contact page: No section band, no scroll fade ❌

**Fix:** Add consistent section bands and scroll momentum fades to all pages.

---

### 9. Typography Color Inconsistency
**Issue:** Text colors vary slightly.

**Current State:**
- Most body text: `text-zinc-300` ✅
- Some body text: `text-zinc-300/90` ❌
- Pricing subtitle: `text-zinc-100` ❌
- Footer tagline: `text-zinc-300` ✅

**Fix:** Standardize body text to `text-zinc-300`. Use `/90` opacity sparingly.

---

### 10. Button Height Inconsistency
**Issue:** Buttons have different heights.

**Current State:**
- Most primary buttons: `h-11` ✅
- Hero CTA: Uses `py-4 md:py-5` (no explicit h-11) ⚠️
- About/Contact pages: `h-11` ✅
- Pricing page: `h-11` ✅

**Fix:** Ensure all primary buttons explicitly use `h-11`.

---

## 🟢 LOW PRIORITY / POLISH

### 11. Icon Size Inconsistency
**Issue:** Icons vary in size across components.

**Current State:**
- Pill icons: `h-3.5 w-3.5` or `h-4 w-4`
- Feature icons: `h-5 w-5`
- Number chip icons: `h-9 w-9` or `h-10 w-10`

**Fix:** Standardize icon sizes within context (pills: `h-3.5 w-3.5`, features: `h-5 w-5`).

---

### 12. Hover Shadow Inconsistency
**Issue:** Hover shadows vary slightly.

**Current State:**
- Most cards: `hover:shadow-[0_18px_40px_rgba(0,0,0,0.65)]` ✅
- Some variations exist

**Fix:** Standardize hover shadow to `hover:shadow-[0_18px_40px_rgba(0,0,0,0.65)]`.

---

### 13. SecondaryCTA Not Used
**Issue:** SecondaryCTA component exists but is not rendered in `app/page.tsx`.

**Current State:**
- Component exists but commented out/removed from page

**Fix:** Either remove component or add it back if needed.

---

### 14. Card Backdrop Blur Inconsistency
**Issue:** Backdrop blur values vary.

**Current State:**
- Hero: `backdrop-blur-md`
- Most cards: `backdrop-blur-xl`
- Some cards: No backdrop blur

**Fix:** Standardize to `backdrop-blur-xl` for glass cards.

---

## 📋 SUMMARY OF REQUIRED FIXES

### High Priority (Must Fix)
1. ✅ Standardize border radius: `rounded-xl` for all cards
2. ✅ Standardize background: `bg-white/[0.06]` for standard cards
3. ✅ Standardize border: `border-white/10` for standard cards
4. ✅ Use shadow utilities consistently
5. ✅ Standardize padding: `px-6 py-6 md:px-7 md:py-7`

### Medium Priority (Should Fix)
6. ✅ Standardize pill labels
7. ✅ Standardize section bands
8. ✅ Add design elements to new pages
9. ✅ Standardize text colors
10. ✅ Ensure button height consistency

### Low Priority (Nice to Have)
11. Standardize icon sizes
12. Standardize hover shadows
13. Remove unused SecondaryCTA or add it back
14. Standardize backdrop blur

---

## 🎯 DESIGN SYSTEM STANDARDS

### Cards
```tsx
className="rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-feature px-6 py-6 md:px-7 md:py-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.65)]"
```

### Pills
```tsx
className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/10 px-4 py-1 text-[11px] font-medium tracking-[0.16em] uppercase text-violet-200"
```

### Primary Buttons
```tsx
className="h-11 rounded-full bg-violet-500 px-6 text-sm font-medium text-white shadow-md shadow-purple-900/40 transition-all duration-200 hover:bg-violet-400 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
```

### Section Bands
```tsx
<div className="pointer-events-none absolute inset-x-0 -top-10 h-40 bg-gradient-to-b from-zinc-900/40 to-transparent" />
```

### Scroll Momentum Fade
```tsx
<div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
```

