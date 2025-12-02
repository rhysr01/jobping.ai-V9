# Final Query Optimization Recommendations

## Current State Analysis

### ✅ What's Good
1. Using exact role names from signup form
2. Early-career filtering in place
3. Multilingual support
4. Role-based queries implemented

### ⚠️ What Could Be Better

#### 1. Role Names with Parentheses
**Issue**: Roles like "Sales Development Representative (SDR)" may not search well
- Job boards might use "SDR" or "Sales Development Representative" separately
- Parentheses might be ignored or cause search issues

**Recommendation**: Add query variations
```javascript
// For "Sales Development Representative (SDR)"
queries.push("Sales Development Representative (SDR)");
queries.push("SDR");  // Common abbreviation
queries.push("Sales Development Representative");  // Without parentheses
```

#### 2. Not Using User Signup Data
**Issue**: We're not prioritizing based on actual user selections
- Database shows: "Business Analyst" selected 5 times, "Junior Associate" 5 times
- But we're using hardcoded priorities

**Recommendation**: Use signup data to prioritize
```javascript
// Query database for most-selected roles
// Prioritize roles that users actually select
```

#### 3. Query Variations Missing
**Issue**: Job boards might use variations of role names
- "Financial Analyst" vs "Finance Analyst"
- "Business Analyst" vs "Business Analysis"
- "Data Analyst" vs "Data Analytics"

**Recommendation**: Add intelligent variations
```javascript
// Generate variations:
// - Remove "Analyst" -> "Analytics"
// - Remove "Representative" -> "Rep"
// - Handle abbreviations
```

#### 4. Role Name Cleaning
**Issue**: Some roles have special characters that might not search well
- "(SDR)", "(BDR)", "(APM)" - parentheses
- "FP&A Analyst" - special character
- "SEO/SEM Intern" - slash

**Recommendation**: Clean and create variations
```javascript
function cleanRoleForSearch(role) {
  // Remove parentheses and content: "Sales Development Representative (SDR)" -> "Sales Development Representative"
  // Handle special characters: "FP&A" -> "FP&A" and "FPA"
  // Handle slashes: "SEO/SEM" -> "SEO", "SEM", "SEO SEM"
}
```

#### 5. Query Limit Optimization
**Issue**: We're adding many role queries but might hit API limits
- Adzuna: Adding 20+ role queries per city
- JobSpy: 6 queries per city (good)
- Reed: 30+ role queries (might be too many)

**Recommendation**: 
- Prioritize top 10-15 roles per city
- Use signup data to determine which roles to prioritize
- Rotate queries over time

#### 6. City-Specific Role Prioritization
**Issue**: Same roles searched in all cities
- "Investment Banking Analyst" might be more relevant in London than Prague
- Should prioritize roles based on city demand

**Recommendation**: Use signup data per city
```javascript
// Get roles selected by users in each city
// Prioritize those roles for that city
```

---

## Recommended Optimizations

### Priority 1: Role Name Cleaning & Variations (HIGH IMPACT)

**Action**: Create role cleaning function
```javascript
function getRoleSearchVariations(role) {
  const variations = [role];
  
  // Remove parentheses: "Sales Development Representative (SDR)" -> "Sales Development Representative", "SDR"
  const parenMatch = role.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    variations.push(parenMatch[1].trim());  // Without parentheses
    variations.push(parenMatch[2].trim());  // Abbreviation only
  }
  
  // Handle special characters: "FP&A" -> "FP&A", "FPA"
  if (role.includes('&')) {
    variations.push(role.replace(/&/g, ''));
  }
  
  // Handle slashes: "SEO/SEM" -> "SEO", "SEM", "SEO SEM"
  if (role.includes('/')) {
    const parts = role.split('/');
    variations.push(...parts);
    variations.push(parts.join(' '));
  }
  
  return [...new Set(variations)];
}
```

### Priority 2: Use Signup Data for Prioritization (MEDIUM IMPACT)

**Action**: Query database for most-selected roles
```javascript
// In automation/real-job-runner.cjs
async function getMostSelectedRoles(limit = 20) {
  const { data } = await supabase
    .from('users')
    .select('roles_selected')
    .not('roles_selected', 'is', null);
  
  const roleCounts = {};
  data.forEach(user => {
    user.roles_selected.forEach(role => {
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });
  });
  
  return Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([role]) => role);
}
```

### Priority 3: Limit Role Queries Per Scraper (MEDIUM IMPACT)

**Current**:
- Adzuna: 20+ role queries per city (might be too many)
- Reed: 30+ role queries (definitely too many)
- JobSpy: 6 queries per city (good)

**Recommendation**:
- Adzuna: Top 10-12 roles per city
- Reed: Top 8-10 roles per city  
- JobSpy: Keep at 6 (already optimal)

### Priority 4: City-Specific Role Prioritization (LOW-MEDIUM IMPACT)

**Action**: Prioritize roles based on city signups
```javascript
// Get roles selected by users in each city
// Prioritize those roles for that city's queries
```

---

## Implementation Priority

1. **Immediate** (1-2 hours):
   - Add role name cleaning/variations
   - Limit Reed queries to top 10 roles
   - Limit Adzuna queries to top 12 roles

2. **Short-term** (1 week):
   - Use signup data for prioritization
   - Add city-specific role prioritization
   - Monitor and remove low-performing queries

3. **Long-term** (1 month):
   - Build query performance tracking
   - A/B test different query strategies
   - Optimize based on actual job match rates

---

## Expected Impact

### Before Final Optimizations
- Some roles with parentheses might not search well
- Not prioritizing based on user demand
- Too many queries in some scrapers

### After Final Optimizations
- ✅ Better search coverage (variations catch more jobs)
- ✅ Higher relevance (prioritize what users want)
- ✅ Better API efficiency (fewer queries, better results)
- ✅ Higher match quality (jobs match user selections better)

---

**Status**: 📋 **RECOMMENDATIONS READY** - Can implement immediately

