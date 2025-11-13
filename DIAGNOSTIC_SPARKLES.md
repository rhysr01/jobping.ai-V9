# Sparkles Component Diagnostic Guide

## What Was Added

1. **SparklesCore Component** (`/components/ui/sparkles.tsx`)
   - Particle animation library using `@tsparticles`
   - Integrated into HeroGeometric as background effect

2. **Enhanced Hero** (`/components/ui/shape-landing-hero.tsx`)
   - Sparkles particles with JobPing brand color (#9A6AFF)
   - Increased visibility: 150 particles, size 0.6-2px, speed 3

3. **Demo Page** (`/app/demo/sparkles/page.tsx`)
   - Three preview variants to test the component

## Debug Console Logs

When the page loads, you should see these console messages:

```
✅ Hero component rendering - using HeroGeometric
✅ HeroGeometric component rendering { prefersReduced: false, willShowSparkles: true }
🎆 SparklesCore should be visible
🎆 SparklesCore: Initializing particles engine...
✅ SparklesCore: Particles engine initialized
🎆 SparklesCore render: { init: true, error: null, id: "hero-sparkles" }
```

## Step-by-Step Verification

### 1. Check Browser Console
Open DevTools (F12) → Console tab:
- Look for the debug messages above
- Check for any red error messages
- If you see "❌ SparklesCore: Failed to initialize", the particles library isn't loading

### 2. Verify Component is in DOM
Open DevTools → Elements/Inspector:
- Search for `id="hero-sparkles"` or `id="tsparticles"`
- If found, the component is rendering
- Check if it has `opacity: 0` (should animate to 1)

### 3. Check Network Tab
Open DevTools → Network tab:
- Filter by "JS" or "Chunk"
- Look for `@tsparticles` related files loading
- If missing, the library isn't being bundled

### 4. Hard Refresh
**Critical**: Do a hard refresh to clear cache:
- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- **Safari**: `Cmd+Option+R` (Mac)

### 5. Test Demo Page
Visit: `https://your-domain.com/demo/sparkles`
- This page shows 3 different sparkles variants
- If this works, the component is fine but hero integration has an issue
- If this doesn't work, the particles library isn't loading

### 6. Check Deployment
Verify the latest code is deployed:
```bash
# Check git status
git status

# Check if files exist
ls -la components/ui/sparkles.tsx
ls -la components/ui/shape-landing-hero.tsx

# Check package.json for dependencies
grep -A 5 "@tsparticles" package.json
```

### 7. Verify Dependencies Installed
```bash
npm list @tsparticles/react @tsparticles/slim @tsparticles/engine
```

Should show:
```
@tsparticles/react@...
@tsparticles/slim@...
@tsparticles/engine@...
```

## Common Issues

### Issue: Console shows "Failed to initialize"
**Solution**: The particles library bundle might be too large or blocked
- Check Network tab for failed requests
- Try reducing `particleDensity` in hero (currently 150)

### Issue: Component renders but particles invisible
**Solution**: Check z-index and opacity
- Sparkles should be at `z-0`
- Content at `z-10`
- Particles animate from `opacity: 0` to `opacity: 1`

### Issue: No console logs at all
**Solution**: Component isn't rendering
- Check if `Hero.tsx` is importing `HeroGeometric`
- Verify `app/page.tsx` imports `Hero` from `@/components/sections/Hero`
- Check for build errors

### Issue: "prefersReduced: true"
**Solution**: Browser/system has reduced motion enabled
- Sparkles are disabled for accessibility
- This is intentional behavior

## Force Visibility Test

To make sparkles VERY visible for testing, temporarily change in `shape-landing-hero.tsx`:

```tsx
<SparklesCore
  id="hero-sparkles"
  background="transparent"
  minSize={2}        // Much larger
  maxSize={5}         // Much larger
  particleDensity={300} // More particles
  className="w-full h-full"
  particleColor="#FF00FF" // Bright magenta (very visible)
  speed={5}          // Faster
/>
```

## Expected Visual Result

- Subtle purple particles (#9A6AFF) floating in background
- Particles should twinkle/fade in and out
- Should be visible but not overwhelming
- Behind all content (geometric shapes, text, buttons)

## Next Steps if Still Not Visible

1. **Check deployment logs** - Ensure build completed successfully
2. **Verify environment** - Make sure you're on production/staging, not local
3. **Check browser compatibility** - Particles require modern browser
4. **Test on different device/browser** - Rule out local cache issues
5. **Check bundle size** - Large bundles might be blocked by CDN

