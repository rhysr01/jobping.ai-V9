# Entry Level Preference Categorization

## Overview

This document explains how jobs are categorized to match the entry level preferences from the signup form.

## Form Options

The signup form has the following entry level preference options:
1. **Internship** (description: "Short-term learning")
2. **Graduate Programmes** (description: "Structured training")
3. **Entry Level** (description: "First full-time role")
4. **Working Student** (description: "Part-time while studying")
5. **Not sure yet** (description: "Open to all")

## Database Categories

Jobs are now categorized with the following categories that map to the form options:

| Form Option | Database Category | Detection Method |
|------------|------------------|-----------------|
| Internship | `internship` | `is_internship` flag + text matching |
| Graduate Programmes | `graduate-programme` | `is_graduate` flag + text matching |
| Entry Level | `entry-level` | `is_early_career` flag + text matching (excluding internships/graduate) |
| Working Student | `working-student` | Text matching for working student terms |
| Not sure yet | N/A | User preference only, not a job category |

## Implementation

### Trigger-Based Categorization

The `categorize_job()` trigger function (in `migrations/activate_categorization_trigger_cohesive.sql`) automatically adds these categories when jobs are inserted or updated:

1. **Internship**: Added when `is_internship = true`
2. **Graduate Programme**: Added when `is_graduate = true`
3. **Working Student**: Added when working student terms are detected in title/description
4. **Entry Level**: Added for entry-level roles that are not internships or graduate programmes

### Backfill Migration

The migration `migrations/20250130_add_entry_level_categories.sql` backfills these categories for all existing active jobs.

## Important Notes

1. **Multiple Categories**: A job can have multiple entry-level categories. For example, a job can be both an "internship" and "working-student" role.

2. **Early-Career Category**: All jobs also have the broader `early-career` category, which is a superset of all entry-level roles.

3. **Matching Logic**: The matching system uses both:
   - Database flags (`is_internship`, `is_graduate`, `is_early_career`)
   - Category arrays (`categories` field)

4. **Not Sure Yet**: This is a user preference only and doesn't correspond to a job category. Users with this preference will see all entry-level jobs.

## Verification

After running the migration, you can verify the categorization with:

```sql
SELECT 
  COUNT(*) FILTER (WHERE 'internship' = ANY(categories)) as internship_count,
  COUNT(*) FILTER (WHERE 'graduate-programme' = ANY(categories)) as graduate_programme_count,
  COUNT(*) FILTER (WHERE 'entry-level' = ANY(categories)) as entry_level_count,
  COUNT(*) FILTER (WHERE 'working-student' = ANY(categories)) as working_student_count,
  COUNT(*) as total_active_jobs
FROM jobs
WHERE is_active = true;
```

## Answer to Original Question

**Q: Should jobs with entry level preference be categorized into at least 1 of these categories?**

**A: Yes, now they are!** All active jobs should now have at least one of these entry-level categories:
- `internship` (for internships)
- `graduate-programme` (for graduate programmes)
- `entry-level` (for entry-level roles)
- `working-student` (for working student roles)

Plus all jobs have the broader `early-career` category.

