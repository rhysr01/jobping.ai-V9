# Data Quality Audit Report

## Executive Summary
Comprehensive audit of job database reveals several data quality issues that need attention.

## Critical Issues

### 1. Company Name Field Mismatch ⚠️ **CRITICAL**
- **7,206 jobs (100%)** have NULL `company_name`
- **0 jobs** have NULL `company` field
- **Problem**: Data exists in `company` field but not in `company_name`
- **Impact**: Inconsistent field usage, potential confusion in codebase
- **Fix**: Sync `company_name` from `company` field

### 2. Missing Location Data ⚠️ **HIGH**
- **2,036 jobs (29%)** have NULL city
- **2,051 jobs (29%)** have NULL country
- **Impact**: Can't filter/search by location for these jobs
- **Fix**: Extract from `location` field or improve scraper extraction

### 3. Missing Descriptions ⚠️ **MEDIUM**
- **518 jobs (7%)** have NULL/empty descriptions
- **1,282 jobs (18%)** have very short descriptions (< 50 chars)
- **Impact**: Poor job matching quality, less context for users
- **Fix**: Improve description extraction from scrapers

### 4. Job Board Companies ⚠️ **MEDIUM**
- **9 jobs** have job boards as company names (Reed, Indeed, Google, Adzuna)
- **Impact**: Users see job boards instead of actual employers
- **Fix**: Filter/flag these at ingestion

## Moderate Issues

### 5. Missing Posted Dates
- **154 jobs (2%)** have NULL `posted_at`
- **4 jobs** have very old dates (> 2 years)
- **Impact**: Can't sort by recency, may show stale jobs

### 6. Inactive/Filtered Jobs
- **1,164 jobs (17%)** marked as inactive
- **205 jobs (3%)** have `filtered_reason` set
- **210 jobs (3%)** have status != 'active'
- **Impact**: These shouldn't be shown to users (may already be filtered)

### 7. Category Issues
- **11 jobs** have empty categories
- **3,120 jobs (45%)** not marked as early-career
- **Impact**: May not match user preferences correctly

### 8. Work Environment Distribution
- **6,780 jobs (98%)** marked as "on-site"
- **157 jobs (2%)** marked as "hybrid"
- **145 jobs (2%)** marked as "remote"
- **Impact**: May not reflect actual work environment distribution

## Good News ✅

### Data Quality Strengths
- ✅ **No duplicate job_hashes** - deduplication working
- ✅ **No NULL job_hashes** - all jobs have unique identifiers
- ✅ **No NULL job URLs** - all jobs have application links
- ✅ **No invalid URLs** - all URLs are properly formatted
- ✅ **No NULL titles** - all jobs have titles
- ✅ **No problematic titles** - no very short/long or numeric-only titles
- ✅ **No experience level issues** - no invalid min/max YOE
- ✅ **No countries as cities** - city normalization working
- ✅ **No future dates** - all dates are valid

## Source-Specific Issues

### Adzuna Source (2,116 jobs)
- **95% missing company_name** (2,010 jobs)
- **82% missing city** (1,726 jobs) ⚠️ **CRITICAL**
- **0% missing descriptions** ✅
- **Main issue**: Location extraction failing

### JobSpy-Indeed (3,093 jobs)
- **99.3% missing company_name** (3,071 jobs)
- **4.5% missing city** (139 jobs) ✅
- **3.4% missing descriptions** (106 jobs)
- **Main issue**: Company name not being set

### Arbeitnow (722 jobs)
- **99.9% missing company_name** (721 jobs)
- **0% missing city** ✅
- **0% missing descriptions** ✅
- **Main issue**: Company name not being set

### Reed (644 jobs)
- **89.4% missing company_name** (576 jobs)
- **0.3% missing city** (2 jobs) ✅
- **0% missing descriptions** ✅
- **Main issue**: Company name not being set

### JobSpy-Internships (613 jobs)
- **99.8% missing company_name** (612 jobs)
- **2.4% missing city** (15 jobs) ✅
- **59% missing descriptions** (361 jobs) ⚠️
- **Main issue**: Company name and descriptions

### Jooble (154 jobs)
- **100% missing company_name** (154 jobs)
- **100% missing city** (154 jobs) ⚠️ **CRITICAL**
- **0% missing descriptions** ✅
- **Main issue**: Complete location extraction failure

### JobSpy-Career-Roles (65 jobs)
- **95.4% missing company_name** (62 jobs)
- **0% missing city** ✅
- **78% missing descriptions** (51 jobs) ⚠️
- **Main issue**: Company name and descriptions

## Recommended Actions

### Immediate (High Priority)
1. **Sync company_name field**: Run migration to populate `company_name` from `company`
2. **Fix location extraction**: Improve city/country extraction from `location` field
3. **Filter job board companies**: Add validation to reject job boards as companies

### Short-term (Medium Priority)
4. **Improve description extraction**: Enhance scrapers to get better descriptions
5. **Fix missing posted dates**: Backfill or extract from other fields
6. **Review inactive jobs**: Clean up or archive properly filtered jobs

### Long-term (Low Priority)
7. **Work environment accuracy**: Verify and improve work environment detection
8. **Category completeness**: Ensure all jobs have proper categories
9. **Early-career flagging**: Review and fix early-career classification

## SQL Fixes Ready

See:
- `migrations/fix_data_quality_issues.sql` - Company name sync, job board filtering
- `scripts/fix-cities-now.sql` - City normalization (already applied)

## Next Steps

1. Run company_name sync migration
2. Improve location extraction in scrapers
3. Add validation to prevent job board companies
4. Monitor data quality metrics going forward

