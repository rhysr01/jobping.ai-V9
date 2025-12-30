# Filter Non-Business Graduate Roles
**Date**: December 29, 2025

## Overview

This migration filters out jobs that are not suitable for business school graduates:
- Senior/Manager/Director roles (require experience)
- Teaching/Education roles (not business-relevant)
- Legal roles (lawyers, attorneys - not compliance/regulatory)
- Medical/Healthcare roles (doctors, nurses, therapists)
- Other non-business roles

## Estimated Impact

| Filter Type | Estimated Jobs | Status |
|-------------|----------------|--------|
| **Senior/Manager/Director** | ~1,364 | ✅ Will be filtered |
| **Teaching/Education** | ~17 | ✅ Will be filtered |
| **Legal** | ~6 | ✅ Will be filtered |
| **Medical/Healthcare** | ~16 | ✅ Will be filtered |
| **Other Non-Business** | ~TBD | ✅ Will be filtered |
| **Total** | **~1,403+** | ✅ |

## What Gets Filtered

### 1. Senior/Manager/Director Roles
**Filtered**:
- `Senior [Role]` (unless graduate program)
- `Manager` (unless trainee/junior/graduate/account/relationship/product)
- `Director`
- `Head of [Department]`
- `VP` / `Vice President`
- `Chief [Role]`
- `Lead` (unless junior/graduate)
- `Principal` (unless graduate)

**Kept**:
- `Graduate Manager`
- `Trainee Manager`
- `Junior Manager`
- `Management Trainee`
- `Account Manager` (sales role)
- `Relationship Manager` (sales role)
- `Product Manager` (can be entry-level)
- `Junior Project Manager`
- `Graduate Program`
- `Graduate Scheme`

### 2. Teaching/Education Roles
**Filtered**:
- `Teacher`
- `Teaching [Subject]`
- `Lecturer`
- `Educator`
- `Tutor`
- `Instructor`
- `Professor`
- `Academic`

**Kept**:
- `Business Teacher`
- `Business Lecturer`
- `Corporate Trainer`
- `Corporate Training`

### 3. Legal Roles
**Filtered**:
- `Lawyer`
- `Attorney`
- `Solicitor`
- `Barrister`
- `Legal Counsel`
- `Legal Advisor`
- `Legal Officer`

**Kept**:
- `Compliance [Role]`
- `Regulatory [Role]`
- `Legal Analyst` (entry-level)
- `Junior Legal [Role]`
- `Graduate Legal [Role]`
- `Legal Intern`
- `Business Legal [Role]`

### 4. Medical/Healthcare Roles
**Filtered**:
- `Nurse`
- `Doctor`
- `Physician`
- `Dentist`
- `Therapist`
- `Counselor`
- `Psychologist`
- `Pharmacist`
- `Surgeon`
- `Veterinarian`

**Kept**:
- `Healthcare Manager`
- `Healthcare Analyst`
- `Healthcare Consultant`
- `Hospital Administrator`

### 5. Other Non-Business Roles
**Filtered**:
- Mechanical/Civil/Electrical/Chemical Engineers (unless software/IT/business)
- Waiter/Waitress/Bartender/Chef
- Retail (unless management/analyst/consultant)
- Military/Soldier
- Fitness/Sports Trainer (unless business-related)

**Kept**:
- Software Engineers
- IT Engineers
- Business Engineers
- Retail Manager/Analyst/Consultant

## How to Apply

### Option 1: Via Supabase Dashboard (Recommended)
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `FILTER_NON_BUSINESS_ROLES.sql`
3. Paste and run

### Option 2: Via Supabase CLI
```bash
cd /Users/rhysrowlands/jobping
supabase migration up
```

## Verification

After applying, run:
```sql
-- Check filtered jobs by reason
SELECT 
    filtered_reason,
    COUNT(*) as job_count
FROM jobs
WHERE is_active = false
  AND (filtered_reason LIKE '%senior%' 
       OR filtered_reason LIKE '%teaching%'
       OR filtered_reason LIKE '%legal%'
       OR filtered_reason LIKE '%medical%'
       OR filtered_reason LIKE '%non_business%')
GROUP BY filtered_reason
ORDER BY job_count DESC;

-- Check remaining active jobs
SELECT COUNT(*) as active_jobs FROM jobs WHERE is_active = true;
```

## Impact

**Before**:
- ❌ ~1,403+ jobs not suitable for business graduates
- ❌ Senior roles mixed with entry-level roles
- ❌ Non-business roles cluttering results

**After**:
- ✅ Only business-relevant roles remain
- ✅ Focus on entry-level, graduate, internship roles
- ✅ Cleaner, more relevant job matches

---

**Status**: ✅ **READY TO APPLY**

**Files**:
- `supabase/migrations/20251229220000_filter_non_business_roles.sql` - Full migration
- `FILTER_NON_BUSINESS_ROLES.sql` - Quick copy-paste version

