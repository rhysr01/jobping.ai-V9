# UI Update Troubleshooting

## Issue: Can't see UI updates after redeploying

### Quick Fixes:

1. **Hard Refresh Browser Cache**
   - Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Firefox: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
   - Safari: `Cmd+Option+R` (Mac)

2. **Clear Next.js Cache**
   ```bash
   rm -rf .next
   npm run build
   ```

3. **Verify Component is Imported**
   - Check: `components/sections/Hero.tsx` imports `HeroGeometric`
   - Check: `app/page.tsx` imports `Hero` from `@/components/sections/Hero`

4. **Check Browser Console**
   - Open DevTools (F12)
   - Look for JavaScript errors
   - Check Network tab for failed requests

5. **Verify Deployment**
   - Ensure the latest code is pushed to your repo
   - Check deployment logs for build errors
   - Verify the deployment completed successfully

### What Changed:

- **Old Hero**: Used `section-padding-hero` class with logo animation
- **New Hero**: Uses `min-h-screen` with geometric animated shapes
- **Location**: `components/ui/shape-landing-hero.tsx` → `HeroGeometric` component

### Expected Visual Changes:

- Animated floating geometric shapes in background
- Large gradient headline text
- Same content (headline, CTA, stats) but with new geometric design
- Dark background (`bg-[#030303]`) with brand/purple gradients

### If Still Not Visible:

1. Check if component renders at all:
   - Add a temporary `console.log('HeroGeometric rendering')` in the component
   - Check browser console

2. Verify Tailwind classes:
   - Check if `bg-[#030303]` and brand colors are working
   - Inspect element to see if classes are applied

3. Check z-index conflicts:
   - Component uses `relative z-10` for content
   - Background shapes use `absolute` positioning

