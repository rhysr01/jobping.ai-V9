# Data Quality Issues Analysis

## Summary
Analysis of job database reveals several critical data quality issues affecting 6,945 jobs.

## Issues Identified

### 1. Job Boards as Company Names
**Problem**: Job boards (Reed, Google, Indeed) are appearing as company names instead of actual employers.

**Examples Found**:
- `company = 'Reed'` (multiple jobs)
- `company = 'Google'` (appears to be from job board, not actual Google jobs)
- `company = 'Indeed'` (from jobspy-career-roles source)

**Impact**: Users see job boards instead of actual employers, reducing trust and clarity.

**Count**: At least 6+ jobs identified, likely more.

### 2. City Normalization Issues
**Problem**: 559 unique cities with many duplicate variations of the same city.

**Major Duplications**:
- **Amsterdam**: 7 variations (77 total jobs)
  - Amsterdam (60), Amsterdam Centrum (4), Amsterdam Noord (1), Amsterdam Oost (4), Amsterdam Westpoort (1), Amsterdam Zuid (6), Amsterdam-zuidoost (1)
  
- **London**: 9 variations (1,138 total jobs)
  - London (1,092), Central London (1), City Of London (1), East London (16), North London (16), North West London (5), South East London (2), South London (2), South West London (5), West London (5)
  
- **Berlin**: 4 variations (271 total jobs)
  - Berlin (263), Berlin-friedrichshain (2), Berlin-kreuzberg (5), Berlin-mitte (1)
  
- **Munich**: 3 variations (287 total jobs)
  - München (189), Munich (94), Garching Bei München (3), Flughafen München (1)
  
- **Brussels**: 5 variations (83 total jobs)
  - Brussels (56), Bruxelles (22), Bruxelles Ixelles (2), Bruxelles Saint-gilles (2), Bruxelles Schaarbeek (1)
  
- **Frankfurt**: 2 variations (29 total jobs)
  - Frankfurt (19), Frankfurt am Main (10)
  
- **Praha**: 8 variations (120 total jobs)
  - Praha (100), Praha 1 (5), Praha 2 (1), Praha 4 (1), Praha 5 (9), Praha 7 (1), Praha 8 (2), Praha 10 (1)

**Additional Issues**:
- Countries used as cities: "España" (62), "Deutschland" (15), "Österreich" (10), "Nederland" (9), "Belgique" (4)
- Generic codes: "W" (16), "Md" (7), "Ct" (6)

**Impact**: 
- Search/filtering by city is fragmented
- User preferences for cities won't match properly
- Analytics are skewed

### 3. Senior/Manager/Teacher Roles
**Problem**: Many non-entry-level roles in database.

**Counts**:
- Senior roles: 278 (4.0% of all jobs)
- Manager roles: 316 (4.5% of all jobs)
- Teacher roles: 53 (0.8% of all jobs)
- **Total**: 647 jobs (9.3% of database)

**Impact**: If targeting early-career users, these roles are not appropriate matches.

### 4. Company Name Field Mismatch
**Problem**: `company_name` field is NULL for 6,941 out of 6,945 jobs (99.9%), but `company` field has data.

**Impact**: 
- Inconsistent field usage
- Potential confusion in codebase
- May need to consolidate or migrate data

## Migration Impact Preview

### City Normalization
**Total jobs affected**: 409 jobs
- Amsterdam variations: 17 jobs
- London variations: 54 jobs  
- Berlin variations: 8 jobs
- Munich variations: 193 jobs (largest impact)
- Brussels variations: 27 jobs
- Frankfurt variations: 10 jobs
- Country names as cities: 100 jobs

**Result**: Will reduce unique cities from 559 to ~450-470 (estimated)

### Job Board Companies
**Total jobs affected**: 6 jobs
- Unique job boards found: 4 (Reed, Google, Indeed, Adzuna)
- These will be flagged with `filtered_reason = 'job_board_as_company'`

### Company Name Sync
**Total jobs affected**: ~6,941 jobs
- Will populate `company_name` from `company` field where currently NULL
- Excludes job board companies (they'll remain NULL)

## Recommendations

### Immediate Actions
1. **City Normalization**: ✅ Migration created (`migrations/fix_data_quality_issues.sql`)
   - Maps all variations to canonical city names
   - Handles district/borough names appropriately
   - Removes country names used as cities

2. **Job Board Filtering**: ✅ Migration created
   - Flags jobs where `company` is a known job board
   - Sets `filtered_reason` for tracking
   - Can be filtered out in queries using `filtered_reason`

3. **Role Filtering**:
   - Migration includes commented-out code to filter Senior/Manager roles
   - Uncomment if you want to mark these as non-early-career
   - Teacher roles: 53 jobs - may be acceptable for some users

4. **Field Consolidation**: ✅ Migration created
   - Syncs `company_name` from `company` field
   - Ensures consistency going forward

### Next Steps
1. **Review the migration** (`migrations/fix_data_quality_issues.sql`)
2. **Test on dev/staging** before production
3. **Run migration** when ready
4. **Update scrapers** to prevent these issues in future:
   - Add city normalization at scrape time
   - Add job board detection
   - Validate company names

### Long-term Improvements
1. Add data validation rules to scrapers
2. Implement city normalization at scrape time
3. Add job board detection and filtering
4. Create data quality monitoring dashboard
5. Add automated data quality checks in CI/CD

