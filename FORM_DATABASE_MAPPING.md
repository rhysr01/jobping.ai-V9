# Form to Database Mapping & Matching Impact

## Current Mapping Status

### ✅ Fully Mapped & Extracted

| Form Field | Form Type | Database Field | Extraction Status | Matching Impact |
|------------|-----------|---------------|-------------------|-----------------|
| **Cities** | `string[]` | `target_cities` | ✅ Extracted | **CRITICAL** - Hard gate filter |
| **Languages** | `string[]` | `languages_spoken` | ✅ Extracted | ⚠️ **Not used in matching** - Should add |
| **Work Environment** | `string[]` | `work_environment` | ✅ **NOW EXTRACTED** | **HIGH** - Hard gate + scoring (+10/-5 points) |
| **Entry Level Preferences** | `string[]` | `entry_level_preference` (joined string) | ✅ Partial | **HIGH** - Scoring (+8/-15 points) |
| **Career Path** | `string` | `career_path` | ✅ Extracted | **CRITICAL** - Hard gate filter |
| **Roles** | `string[]` | `roles_selected` | ✅ Extracted | **CRITICAL** - Hard gate filter |

### ⚠️ Partially Mapped

| Form Field | Form Type | Database Field | Issue | Matching Impact |
|------------|-----------|---------------|-------|-----------------|
| **Entry Level Preferences** | `string[]` | `entry_level_preference` (string) | Form allows multiple: `["Internship", "Graduate Programmes", "Entry Level", "Working Student"]` but stored as joined string. Job flags (`is_internship`, `is_graduate`) exist but don't map to "Working Student" or "Entry Level" | **HIGH** - Matching checks keywords but could be more precise |
| **Work Environment** | `string[]` | `work_environment` (string) | Form allows multiple: `["Office", "Hybrid", "Remote"]` but database stores single value. Mapping: "Office" → "on-site" | **HIGH** - Used in hard gates and scoring |

### ❌ Not Extracted/Stored

| Form Field | Form Type | Database Field | Status | Matching Impact |
|------------|-----------|---------------|--------|-----------------|
| **Industries** | `string[]` | `industries` (users only) | ❌ Not extracted from jobs | **MEDIUM** - Would boost matching score if extracted |
| **Company Size** | `string` | `company_size_preference` (users only) | ❌ Not extracted from jobs | **LOW** - Would boost matching score if extracted |
| **Skills** | `string[]` | `skills` (users only) | ❌ Not extracted from jobs | **MEDIUM** - Would boost matching score if extracted |
| **Visa Status** | `string` | `visa_status` (users only) | ❌ Not extracted from jobs | **MEDIUM** - Would filter out jobs requiring sponsorship |
| **Salary** | N/A | N/A | ❌ Not extracted (bonus field) | **LOW** - Would be nice-to-have for user info |

## Form Options → Database Values

### Entry Level Preferences

**Form Options:**
- `"Internship"` → Job: `is_internship: true`, `experience_required: "internship"`
- `"Graduate Programmes"` → Job: `is_graduate: true`, `experience_required: "graduate"`
- `"Entry Level"` → Job: `is_early_career: true`, `experience_required: "entry-level"` (no specific flag)
- `"Working Student"` → Job: No specific flag (could use `is_internship` or new flag)
- `"Not sure yet"` → Job: All early-career jobs match

**Current Matching:**
- Checks `is_internship` flag → +25 points if user preference includes "intern"
- Checks `is_graduate` flag → +25 points if user preference includes "grad"
- Falls back to text matching in title/description
- **Issue**: "Entry Level" and "Working Student" don't have specific flags

### Work Environment

**Form Options:**
- `"Office"` → Database: `work_environment: "on-site"`
- `"Hybrid"` → Database: `work_environment: "hybrid"`
- `"Remote"` → Database: `work_environment: "remote"`

**Current Matching:**
- Hard gate: If user specifies work environment, job must match (or be hybrid)
- Scoring: +10 points for match, -5 points for mismatch
- **Status**: ✅ Now extracted from location/description

## New Flag: `is_early_career`

**Why Add It:**
- Currently using `categories: ['early-career']` to mark early-career jobs
- Matching uses `hasEligibility(categories)` which checks for 'early-career'
- An explicit boolean flag is cleaner and more consistent
- All scraped jobs should be `is_early_career: true`

**Implementation:**
- ✅ Added to all scrapers
- ✅ Added to fix script
- All jobs will have `is_early_career: true`

## Matching Impact Analysis

### Current Matching Logic

1. **Hard Gates (Must Pass):**
   - ✅ Location match (uses `city` field)
   - ✅ Career path match (uses `categories`)
   - ✅ Early career eligibility (uses `categories: ['early-career']` or `is_early_career`)
   - ✅ Work environment (uses `work_environment` field) - **NOW EXTRACTED**

2. **Scoring (Bonus Points):**
   - Entry level preference: +25 points for perfect match (`is_internship`/`is_graduate` flags)
   - Work environment: +10 points for match, -5 for mismatch
   - **Missing**: Language requirements not used in scoring

### Improvements Needed

1. **Language Requirements Matching:**
   - Currently extracted but **not used in matching**
   - Should add: +5-10 points if job `language_requirements` matches user `languages_spoken`
   - Should filter: If job requires language user doesn't speak, reduce score

2. **Entry Level Consistency:**
   - Form allows multiple selections but matching only checks single string
   - Should check if user selected "Internship" AND job has `is_internship: true`
   - Should check if user selected "Graduate Programmes" AND job has `is_graduate: true`
   - "Entry Level" and "Working Student" need better mapping

3. **Missing Fields Impact:**
   - **Industries**: Would add +5-10 points if job industry matches user preference
   - **Skills**: Would add +3-5 points per matching skill
   - **Company Size**: Would add +3-5 points if matches user preference
   - **Visa Status**: Would filter out jobs requiring sponsorship if user can't provide

## Recommendations

### High Priority
1. ✅ **DONE**: Add `is_early_career` flag to all jobs
2. ✅ **DONE**: Extract `work_environment` from location/description
3. ✅ **DONE**: Extract `language_requirements` from descriptions
4. **TODO**: Update matching to use `language_requirements` field
5. **TODO**: Improve entry level preference matching to use flags properly

### Medium Priority
6. **TODO**: Add database columns for `industries`, `skills`, `company_size` on jobs table
7. **TODO**: Extract and store industries, skills, company size from job descriptions
8. **TODO**: Update matching to use these fields for scoring

### Low Priority
9. **TODO**: Extract visa/sponsorship requirements
10. **TODO**: Extract salary ranges (bonus field)

## Consistency Checklist

- ✅ All jobs have `is_early_career: true`
- ✅ All jobs have `work_environment` extracted (not hardcoded)
- ✅ All jobs have `language_requirements` extracted (if mentioned)
- ✅ Form options map correctly to database values
- ⚠️ Entry level preferences need better flag mapping
- ❌ Industries, skills, company size not extracted (need DB columns first)

