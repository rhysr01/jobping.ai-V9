# Quick Sparkles Verification Checklist

## Immediate Actions

1. **Hard Refresh Your Browser**
   - Mac: `Cmd + Shift + R`
   - Windows: `Ctrl + Shift + R`
   - This is CRITICAL - browser cache is likely hiding changes

2. **Open Browser Console** (F12)
   - Look for these messages:
     - `✅ Hero component rendering`
     - `✅ HeroGeometric component rendering`
     - `🎆 SparklesCore: Initializing particles engine...`
     - `✅ SparklesCore: Particles engine initialized`
   
   **If you see errors**, copy them and share them.

3. **Check Network Tab**
   - Open DevTools → Network
   - Filter by "JS"
   - Refresh page
   - Look for files containing "tsparticles" or "particles"
   - If missing, the library isn't loading

4. **Test Demo Page**
   Visit: `https://your-domain.com/demo/sparkles`
   - If this page shows sparkles, the component works
   - If this page doesn't show sparkles, there's a library issue

5. **Verify Deployment**
   - Check your deployment platform (Vercel/Netlify/etc)
   - Confirm the latest commit is deployed
   - Check build logs for errors

## What Changed

- **SparklesCore component** added to hero background
- **Particle settings**: 200 particles, size 1-3px, purple color (#9A6AFF)
- **Version fix**: Updated @tsparticles/react to match engine version

## If Still Not Visible

The particles are subtle by design. To make them VERY visible for testing:

1. Open `components/ui/shape-landing-hero.tsx`
2. Find the SparklesCore component (around line 258)
3. Temporarily change:
   - `particleColor="#FF00FF"` (bright magenta)
   - `particleDensity={500}` (many more particles)
   - `minSize={3}` and `maxSize={6}` (much larger)

This will make them impossible to miss if they're rendering.

## Common Causes

1. **Browser cache** - 90% of cases
2. **Deployment cache** - Build cache not cleared
3. **Reduced motion enabled** - Particles disabled for accessibility
4. **Library not loading** - Network/CDN blocking particles bundle

