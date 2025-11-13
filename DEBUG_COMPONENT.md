# Debugging Component Visibility

## Quick Checks:

1. **Verify Component is Imported:**
   ```bash
   grep -r "HeroGeometric" components/sections/Hero.tsx
   # Should show: import { HeroGeometric } from "@/components/ui/shape-landing-hero";
   ```

2. **Check Build Output:**
   ```bash
   npm run build
   # Look for any errors in the build
   ```

3. **Test Locally:**
   ```bash
   npm run dev
   # Visit http://localhost:3000
   # Open browser console (F12) and check for errors
   ```

4. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for JavaScript errors
   - Check if component is rendering (inspect element)

5. **Hard Refresh:**
   - Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Firefox: `Ctrl+F5` or `Cmd+Shift+R`
   - Safari: `Cmd+Option+R`

6. **Clear Next.js Cache:**
   ```bash
   rm -rf .next
   npm run build
   ```

## Component Status:
- ✅ HeroGeometric is exported correctly
- ✅ Hero.tsx imports HeroGeometric
- ✅ app/page.tsx uses Hero component
- ✅ Build completes successfully

## If Still Not Visible:

1. Check if old Hero is cached in browser
2. Verify deployment actually deployed new code
3. Check browser console for runtime errors
4. Inspect element to see if component is rendering but hidden

