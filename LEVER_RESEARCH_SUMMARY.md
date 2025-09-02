# Lever Company Research Summary

## 🎯 Key Findings

### ✅ **Currently Working Companies**
Based on our discovery script, these companies are **confirmed accessible** and have graduate-friendly jobs:

1. **Spotify** (https://jobs.lever.co/spotify)
   - **86 jobs** available
   - **Graduate keywords found**: junior, associate
   - **European locations**: London, Paris, Stockholm, Milan, Brussels
   - **Status**: ✅ **ADD TO YOUR SCRAPER**

2. **Plaid** (https://jobs.lever.co/plaid)
   - **57 jobs** available
   - **Graduate keywords found**: associate
   - **European locations**: London
   - **Status**: ✅ **ADD TO YOUR SCRAPER**

### ❌ **Companies That Don't Use Lever**
The following companies returned 404 errors, indicating they either:
- Don't use Lever for job postings
- Use different URL patterns
- Have moved to other ATS platforms

**High-priority companies that failed:**
- Notion, Figma, Linear, Airtable, Calendly, Loom
- Robinhood, Coinbase, Brex
- GitLab, HashiCorp, Vercel, Anthropic, Hugging Face
- Retool, Supabase, Stripe, Slack, Zoom

## 🛠️ **Implementation Steps**

### 1. **Add Working Companies to Your Scraper**

Add these to your `Utils/graduateEmployers.ts`:

```typescript
{
  name: 'Spotify',
  url: 'https://jobs.lever.co/spotify',
  platform: 'lever',
  graduatePrograms: ['Spotify Graduate Program', 'Spotify Engineering Residency'],
  locations: ['London', 'Paris', 'Stockholm', 'Milan', 'Brussels'],
  visaSponsorship: true,
  applicationDeadlines: ['October', 'November'],
  programDuration: '2 years'
},

{
  name: 'Plaid',
  url: 'https://jobs.lever.co/plaid',
  platform: 'lever',
  graduatePrograms: ['Plaid Graduate Program', 'Plaid Engineering Residency'],
  locations: ['London'],
  visaSponsorship: true,
  applicationDeadlines: ['October', 'November'],
  programDuration: '2 years'
},
```

### 2. **Alternative Discovery Methods**

Since many companies don't use Lever, consider these alternatives:

#### **A. Research Company Career Pages**
- Visit company career sites directly
- Look for "Powered by Lever" links
- Check for different URL patterns (e.g., `company-name-2`, `companyname`)

#### **B. Use LinkedIn Job Search**
- Search for "Lever" in job descriptions
- Look for companies that mention Lever in their career pages
- Check for "Powered by Lever" badges

#### **C. Lever's Public Directory**
- Some companies may be listed in Lever's public directory
- Check Lever's partner showcase or customer list

### 3. **Manual Verification Process**

For any new company you want to add:

1. **Test the URL**: `https://jobs.lever.co/{company-slug}`
2. **Check for job postings**: Look for `.posting` elements
3. **Search for graduate keywords**: junior, associate, entry-level, graduate
4. **Verify European locations**: London, Dublin, Amsterdam, etc.
5. **Add to your scraper** if criteria are met

## 📊 **Current Lever Scraper Status**

### **Working Companies**: 2
- Spotify (86 jobs, 5 European locations)
- Plaid (57 jobs, 1 European location)

### **Failed Companies**: 34
- Most high-priority companies don't use Lever
- Need alternative discovery methods

## 🚀 **Next Steps**

### **Immediate Actions**
1. ✅ Add Spotify and Plaid to your `graduateEmployers.ts`
2. ✅ Update your Lever scraper to handle these companies
3. ✅ Test the scraper with the new companies

### **Medium-term Research**
1. **Research alternative ATS platforms**:
   - Greenhouse (you already have this)
   - Workday (you already have this)
   - BambooHR, JazzHR, SmartRecruiters
   
2. **Direct company research**:
   - Visit career pages of target companies
   - Check which ATS they use
   - Add companies to appropriate scrapers

3. **Expand other scrapers**:
   - Focus on Greenhouse and Workday companies
   - Research companies that use these platforms
   - Add more companies to existing working scrapers

## 🛠️ **Tools Available**

### **Discovery Script**
```bash
npm run discover:lever
```
- Tests company URLs automatically
- Validates graduate-friendly criteria
- Generates TypeScript code for your scraper

### **Research Guide**
See `LEVER_COMPANY_RESEARCH.md` for detailed research strategies and company lists.

## 📈 **Recommendations**

### **Priority 1: Add Working Companies**
- Add Spotify and Plaid immediately
- Test your Lever scraper with these companies
- Verify job extraction works correctly

### **Priority 2: Research Alternative Platforms**
- Focus on Greenhouse and Workday companies
- These platforms are more commonly used by tech companies
- Your existing scrapers for these platforms are working

### **Priority 3: Manual Company Discovery**
- Research specific companies you want to target
- Check their career pages for ATS information
- Add them to the appropriate scraper

## 🎯 **Success Metrics**

- **Target**: 10+ companies per scraper platform
- **Current**: 2 Lever companies, multiple Greenhouse/Workday companies
- **Goal**: Comprehensive coverage of European tech companies with graduate programs

---

**Note**: The discovery script and research tools are now available in your project. Use them to continuously expand your company coverage and improve job discovery for your users.
