# Query Optimization Analysis

## Current State

### ✅ What's Working Well

1. **JobSpy Career Path Roles Scraper** (`jobspy-career-path-roles.cjs`):
   - ✅ Uses **exact role names** from signup form
   - ✅ Searches for roles like "Financial Analyst", "Finance Intern", "Investment Banking Analyst"
   - ⚠️ **Limited**: Only 10 roles per city (MAX_ROLES_PER_CITY)

2. **Early-Career Filtering**:
   - ✅ All scrapers filter for early-career jobs
   - ✅ Multilingual early-career terms included
   - ✅ Internship/graduate prioritization

### ⚠️ What Needs Optimization

1. **JobSpy Main Scraper** (`jobspy-save.cjs`):
   - Uses generic queries: "graduate programme", "investment banking analyst", "finance graduate"
   - ❌ Not using exact role names from signup form
   - ❌ Missing specific roles like "Financial Analyst", "Finance Intern"

2. **Adzuna Scraper** (`adzuna-categories-scraper.cjs`):
   - Uses generic queries: "internship", "graduate programme", "junior", "entry level"
   - Uses sector-based: "finance graduate", "marketing graduate"
   - ❌ Not using exact role names from signup form
   - ✅ Has internship combinations: "finance internship", "marketing internship"

3. **Reed Scraper** (`reed-scraper-standalone.cjs`):
   - Uses very generic terms: "graduate", "entry level", "junior", "trainee", "intern", "internship"
   - ❌ Too generic - not role-specific
   - ❌ Not using exact role names from signup form

## Signup Form Roles (What Users Select)

### Strategy & Business Design
- Business Analyst, Associate Consultant, Junior Consultant, Strategy Analyst, Consulting Intern, etc.

### Finance & Investment
- Financial Analyst, Finance Intern, Investment Banking Analyst, Risk Analyst, Audit Associate, etc.

### Sales & Client Success
- Sales Development Representative (SDR), Business Development Representative (BDR), Account Executive, etc.

### Marketing
- Marketing Intern, Social Media Intern, Digital Marketing Assistant, Marketing Coordinator, etc.

### Data Analytics
- Data Analyst, Junior Data Analyst, Analytics Intern, Business Intelligence Intern, etc.

### Operations & Supply Chain
- Operations Analyst, Supply Chain Analyst, Logistics Analyst, Procurement Analyst, etc.

### Product & Innovation
- Associate Product Manager (APM), Product Analyst, Product Management Intern, etc.

### Tech & Transformation
- Software Engineer Intern, Cloud Engineer Intern, DevOps Engineer Intern, etc.

### Sustainability & ESG
- ESG Intern, Sustainability Strategy Intern, Junior ESG Analyst, etc.

## Optimization Recommendations

### 1. Enhance JobSpy Main Scraper

**Current**: Generic queries like "graduate programme", "finance graduate"
**Recommended**: Add role-specific queries from signup form

```javascript
// Add role-based queries alongside generic ones
const ROLE_BASED_QUERIES = {
  'finance': [
    'Financial Analyst', 'Finance Intern', 'Investment Banking Analyst',
    'Risk Analyst', 'FP&A Analyst', 'Credit Analyst'
  ],
  'strategy': [
    'Business Analyst', 'Strategy Analyst', 'Consulting Intern',
    'Management Consulting Intern', 'Junior Consultant'
  ],
  'marketing': [
    'Marketing Intern', 'Digital Marketing Assistant', 'Marketing Coordinator',
    'Social Media Intern', 'Growth Marketing Intern'
  ],
  // ... etc for all career paths
};
```

### 2. Enhance Adzuna Scraper

**Current**: Generic "internship", "graduate programme" + sector-based "finance graduate"
**Recommended**: Add role-specific queries

```javascript
// Add role-specific queries
const ROLE_SPECIFIC_QUERIES = [
  'Financial Analyst', 'Finance Intern', 'Investment Banking Analyst',
  'Business Analyst', 'Marketing Intern', 'Data Analyst',
  'Operations Analyst', 'Product Analyst', 'Sales Development Representative',
  // ... all roles from signup form
];
```

### 3. Enhance Reed Scraper

**Current**: Very generic "graduate", "entry level", "junior"
**Recommended**: Add role-specific queries

```javascript
// Replace generic EARLY_TERMS with role-specific queries
const ROLE_BASED_EARLY_TERMS = [
  'Financial Analyst', 'Finance Intern', 'Business Analyst',
  'Marketing Intern', 'Data Analyst', 'Operations Analyst',
  'Investment Banking Analyst', 'Consulting Intern',
  // ... prioritize exact role names
];
```

### 4. Prioritize Exact Role Matches

**Strategy**: 
1. **First Priority**: Exact role names from signup form (e.g., "Financial Analyst")
2. **Second Priority**: Role + early-career modifier (e.g., "Financial Analyst Intern", "Junior Financial Analyst")
3. **Third Priority**: Generic early-career terms (e.g., "finance graduate", "internship")

## Implementation Plan

### Phase 1: Extract Role Lists (1 hour)
- [ ] Create shared role list module
- [ ] Extract all roles from signup form CAREER_PATHS
- [ ] Create role-to-career-path mapping

### Phase 2: Enhance JobSpy Main Scraper (2 hours)
- [ ] Add role-based queries alongside generic ones
- [ ] Prioritize exact role matches
- [ ] Test with sample cities

### Phase 3: Enhance Adzuna Scraper (2 hours)
- [ ] Add role-specific queries
- [ ] Combine with existing sector-based queries
- [ ] Test with sample cities

### Phase 4: Enhance Reed Scraper (1 hour)
- [ ] Replace generic EARLY_TERMS with role-specific queries
- [ ] Keep generic terms as fallback
- [ ] Test with sample cities

### Phase 5: Increase Career Path Roles Limit (30 min)
- [ ] Increase MAX_ROLES_PER_CITY from 10 to 20-30
- [ ] Monitor API quota impact
- [ ] Test performance

## Expected Impact

### Before Optimization
- Generic queries: "finance graduate", "internship", "junior"
- May miss specific roles users selected
- Lower match quality

### After Optimization
- Role-specific queries: "Financial Analyst", "Finance Intern", "Investment Banking Analyst"
- Better match with user selections
- Higher match quality
- More relevant jobs

## Code Changes Needed

1. **Create shared role list** (`scrapers/shared/roles.cjs`):
   - Extract all roles from CAREER_PATHS
   - Provide role lists by career path
   - Provide all roles combined

2. **Update JobSpy main scraper**:
   - Import role lists
   - Add role-based queries to QUERY_SETS
   - Prioritize role matches

3. **Update Adzuna scraper**:
   - Import role lists
   - Add role-specific queries to generateCityQueries()
   - Combine with existing sector queries

4. **Update Reed scraper**:
   - Import role lists
   - Replace EARLY_TERMS with role-specific queries
   - Keep generic terms as fallback

5. **Update Career Path Roles scraper**:
   - Increase MAX_ROLES_PER_CITY limit
   - Optimize role selection per city

---

**Status**: 📋 **ANALYSIS COMPLETE** - Ready for implementation

