# Database Weaknesses Affecting AI Matching

## Critical Issues (High Priority)

### 1. **Missing City Data (30.5% of jobs)**
- **Impact**: AI matching relies heavily on location filtering
- **Numbers**: 4,249 jobs missing `city` field out of 13,938 total
- **By Source**:
  - `jobspy-career-roles`: 97.81% missing city (716/732 jobs)
  - `jobspy-internships`: 63.98% missing city (2,016/3,151 jobs)
  - `jobspy-indeed`: 44.51% missing city (1,517/3,408 jobs)
  - `adzuna`, `reed`, `greenhouse`: 0% missing (excellent)

**Problem**: Jobs have `location` field (e.g., "London, England") but `city` is NULL. The matching system checks `city` field first, so these jobs may be incorrectly filtered out.

**Solution**: Run location parsing/backfill script to extract city from location string.

---

### 2. **Poor Description Quality (39.8% of jobs)**
- **Impact**: AI embeddings and semantic matching depend on rich descriptions
- **Numbers**: 5,543 jobs have poor descriptions (<50 chars or NULL)
- **By Source**:
  - `jobspy-internships`: 80.58% poor descriptions
  - `jobspy-career-roles`: 72.27% poor descriptions
  - `jobspy-indeed`: 72.62% poor descriptions
  - `adzuna`, `reed`, `greenhouse`: 0% poor descriptions (excellent)

**Problem**: 
- Many jobs have empty descriptions (0 length)
- AI matching uses description for semantic similarity
- Without descriptions, embeddings are based only on title/company, reducing match quality

**Sample Issues**:
- "2026 UK Human Resources Summer Internship" - 0 char description
- "2026 Real Estate Internship Programme" - 0 char description
- "Intern (Strategy)" - 0 char description

**Solution**: 
- Scrapers should prioritize sources with descriptions
- Consider enriching descriptions from job URLs
- Use title + company as fallback for embedding generation

---

### 3. **Location Parsing Inconsistency**
- **Impact**: Location matching is critical for user preferences
- **Numbers**: 4,249 jobs have location but no parsed city
- **Patterns Found**:
  - 2,501 jobs have comma-separated locations (can be parsed)
  - 1,364 jobs have simple city names (can be parsed)
  - Many locations like "London, England", "London, ENG, GB", "London, GB" all need to map to city="London"

**Problem**: 
- Location formats vary: "London, England" vs "London, ENG, GB" vs "London, GB"
- City extraction logic exists but hasn't been run on all jobs
- Matching falls back to string matching on `location` field, which is less reliable

**Solution**: 
- Run `backfill_location_data.sql` migration
- Or implement location parsing in scraper ingestion pipeline

---

## Moderate Issues (Medium Priority)

### 4. **Missing Experience Level (0.05%)**
- **Impact**: Minor - only 7 jobs affected
- **Numbers**: 7 jobs missing `experience_required` field
- **Status**: Very low impact, but should be fixed

---

### 5. **Missing Categories (0.01%)**
- **Impact**: Low - only 2 jobs affected
- **Numbers**: 2 jobs have NULL or empty categories array
- **Status**: Minimal impact, but category filtering won't work for these

---

### 6. **Duplicate Job Titles (Potential Data Quality Issue)**
- **Impact**: May cause confusion in matching
- **Examples**:
  - "business analyst" appears 136 times (different companies/locations - this is OK)
  - "data analyst" appears 54 times
  - "finance analyst" appears 31 times

**Status**: This is actually normal - same role at different companies. Not a problem unless same hash appears multiple times (which it doesn't - checked).

---

## Source-Specific Quality Issues

### JobSpy Sources (Indeed, Internships, Career Roles)
**Common Problems**:
1. **High missing city rate** (44-98%)
2. **High poor description rate** (72-81%)
3. **Location data exists but not parsed**

**Recommendation**: 
- Add city extraction to JobSpy scrapers before saving
- Consider using description from job URLs if available
- Prioritize JobSpy sources that provide descriptions

### Adzuna, Reed, Greenhouse
**Status**: Excellent data quality
- 100% have city data
- 100% have good descriptions
- 100% have categories
- These sources are reliable for AI matching

---

## Recommendations for Fixing

### Immediate Actions (High Impact)

1. **Run Location Backfill**:
   ```sql
   -- Run the backfill_location_data migration
   -- This will extract city from location for 4,249 jobs
   ```

2. **Improve JobSpy Scrapers**:
   - Extract city from location string before saving
   - Try to fetch full descriptions from job URLs
   - Add validation to ensure minimum description length

3. **Enhance Embedding Generation**:
   - For jobs without descriptions, use: `title + company + location + categories`
   - This will improve semantic matching even for jobs with poor descriptions

### Medium-Term Actions

1. **Description Enrichment**:
   - Scrape full job descriptions from URLs when available
   - Use job board APIs to get richer data
   - Consider using AI to generate descriptions from title/company/category

2. **Data Quality Monitoring**:
   - Add checks in scraper pipeline to flag poor quality jobs
   - Set minimum thresholds (e.g., description > 100 chars, city must exist)
   - Log quality metrics per source

3. **Fallback Strategies**:
   - For matching, if city is NULL, parse from location on-the-fly
   - For embeddings, use title+company+location if description is missing
   - For categories, infer from title if missing

---

## Impact Summary

| Issue | Jobs Affected | Impact on AI Matching | Priority |
|-------|--------------|----------------------|----------|
| Missing City | 4,249 (30.5%) | **HIGH** - Location filtering fails | 🔴 Critical |
| Poor Descriptions | 5,543 (39.8%) | **HIGH** - Semantic matching degraded | 🔴 Critical |
| Location Parsing | 4,249 (30.5%) | **MEDIUM** - Can be fixed with backfill | 🟡 High |
| Missing Experience | 7 (0.05%) | **LOW** - Minimal impact | 🟢 Low |
| Missing Categories | 2 (0.01%) | **LOW** - Minimal impact | 🟢 Low |

---

## Testing Recommendations

After fixes, verify:
1. All active jobs have `city` field populated
2. Description quality improves (target: <20% poor descriptions)
3. Location matching accuracy improves
4. Semantic matching scores improve for JobSpy sources

