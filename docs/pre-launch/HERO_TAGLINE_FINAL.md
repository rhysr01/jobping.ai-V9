# ✅ Hero Tagline Update - FINAL VERSION

**Status:** Ready to implement  
**File:** `components/sections/hero.tsx`  
**Line:** ~276

---

## 🎯 FINAL APPROVED COPY

```
Skip 40+ hours of job searching. Get 5 roles matching your 
skills, location, and visa in 2 minutes.
```

---

## 🔧 IMPLEMENTATION

### **Find this section (around line 276):**

```tsx
{/* Tagline - Simplified */}
<motion.p
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.22, duration: 0.6 }}
  className="text-base sm:text-lg md:text-xl text-zinc-300 leading-relaxed max-w-xl mb-4 mt-2 sm:mt-4 overflow-visible"
  style={{ wordSpacing: "0.02em" }}
>
  AI-powered job matching for early-career roles across Europe. Get
  personalized matches delivered to your inbox.
</motion.p>
```

### **Replace with:**

```tsx
{/* Tagline - No BS, straight value */}
<motion.p
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.22, duration: 0.6 }}
  className="text-base sm:text-lg md:text-xl text-zinc-300 leading-relaxed max-w-xl mb-4 mt-2 sm:mt-4 overflow-visible"
  style={{ wordSpacing: "0.02em" }}
>
  Skip 40+ hours of job searching. Get 5 roles matching your skills, 
  location, and visa in 2 minutes.
</motion.p>
```

---

## ✅ WHAT THIS ACHIEVES

1. **"Skip 40+ hours"** - Dramatic time savings (bigger than "save 10 hours/week")
2. **"Get 5 roles"** - Specific number (your free tier USP)
3. **"matching your skills, location, and visa"** - Three key filters
4. **"in 2 minutes"** - Speed + urgency
5. **No BS** - Clean, direct, benefit-focused

---

## 📊 COMPARISON

| Element | Before | After |
|---------|--------|-------|
| Opening | "AI-powered job matching" (generic) | "Skip 40+ hours" (dramatic benefit) |
| Specificity | Vague | "5 roles" (specific) |
| Key Filters | Missing | skills + location + visa |
| Urgency | "delivered to your inbox" | "in 2 minutes" |
| Word Count | 16 words | 16 words |

---

## 🚀 READY TO COMMIT

```bash
# Test locally first
npm run dev

# Then commit
git add components/sections/hero.tsx
git commit -m "Update hero tagline: skip 40+ hours, get 5 roles in 2 min"
git push
```

---

## ✅ DONE!

Clean. Direct. No BS. Just like you wanted. 💪
