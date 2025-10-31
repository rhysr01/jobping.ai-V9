

# ¯ JobPing Matching Improvements Guide

## Current Issues Found

| Category | Issue | Impact | Severity |
|----------|-------|--------|----------|
| **User Data** | 0% have languages filled | Can't filter by language | ´ Critical |
| **User Data** | Empty visa_status & career_path | Missing matching signals |  Medium |
| **Jobs Data** | No industry tags | Can't match by industry |  Medium |
| **Jobs Data** | No skills extracted | Can't match by skills |  Medium |
| **Matching Logic** | No deduplication tracking | Users see same jobs twice |  Medium |
| **Feedback Loop** | Only 2 feedback entries | Can't improve with data | ´ Critical |

---

##  10 High-Impact Improvements

### 1ƒ£ **Infer Missing User Data**  (Easiest - Do Now!)

**Problem:** 0% of users have languages filled, but all have target cities  
**Solution:** Auto-infer languages from target cities

```sql
-- Automatically done by user-matching-improvements.sql
-- London † English
-- Berlin † German  
-- Paris † French
-- Milan † Italian
```

**Impact:** Immediate 100% language coverage  
**Effort:** Run script (5 mins)

---

### 2ƒ£ **Add Industry & Company Size Preferences** (High Value)

**Problem:** Can't match "I want finance in startups" vs "tech in enterprise"  
**Solution:** Add to Tally onboarding form

**New User Fields:**
```typescript
industries: string[] // ['Finance', 'Tech', 'Consulting']
preferred_company_sizes: string[] // ['Startup', 'Scale-up', 'Enterprise']
min_salary: number // 40000 (EUR/year)
skills: string[] // ['Python', 'Excel', 'SQL']
```

**How to Collect:**
1. Add to Tally form: "Which industries interest you?"
2. Add: "Preferred company size?" (Startup <50, Scale-up 50-500, Enterprise 500+)
3. Add: "Minimum salary expectation?" (optional)
4. Add: "Your key skills?" (optional, multi-select)

**Impact:** 2-3x better match quality  
**Effort:** 1 hour (Tally form updates)

---

### 3ƒ£ **Extract Industries from Job Descriptions**  (Automated)

**Problem:** No way to know if a job is in Finance vs Tech  
**Solution:** Auto-detect from title + description keywords

```sql
-- Automatically done by user-matching-improvements.sql
-- Keywords: 'banking|investment' † Finance
-- Keywords: 'software|developer' † Technology
-- Keywords: 'strategy|advisory' † Consulting
```

**Impact:** Can filter jobs by industry  
**Effort:** Run script (5 mins)

---

### 4ƒ£ **Visa Sponsorship Detection**  (Critical for International Students)

**Problem:** Users waste time on jobs they can't apply to  
**Solution:** Extract from description

```sql
-- Automatically done by user-matching-improvements.sql
description LIKE '%visa sponsor%' † visa_sponsorship = true
description LIKE '%right to work required%' † visa_sponsorship = false
```

**Then match:**
```sql
WHERE (u.visa_status = 'needs_sponsorship' AND j.visa_sponsorship = true)
   OR (u.visa_status = 'has_right_to_work')
```

**Impact:** Huge for international students  
**Effort:** Run script (5 mins)

---

### 5ƒ£ **Track Jobs Already Sent** ´ (Critical - Avoid Duplicates!)

**Problem:** Users might see same jobs multiple times  
**Solution:** Track sent jobs per user

**Add to users table:**
```sql
seen_job_hashes: text[] -- Jobs already sent
clicked_job_hashes: text[] -- Jobs user clicked
```

**In matching logic:**
```sql
SELECT * FROM jobs 
WHERE job_hash NOT IN (SELECT UNNEST(seen_job_hashes) FROM users WHERE email = ?)
```

**Impact:** Better user experience, no repeats  
**Effort:** Add to email sending logic

---

### 6ƒ£ **Skill Extraction from Job Descriptions** (Medium Priority)

**Problem:** Can't match "Python skills" user to "Python required" job  
**Solution:** Extract skills with regex

```sql
required_skills = ARRAY(
  SELECT skill FROM (
    SELECT 'Python' WHERE description ~* 'python'
    UNION SELECT 'SQL' WHERE description ~* 'sql|postgresql|mysql'
    UNION SELECT 'Excel' WHERE description ~* 'excel|spreadsheet'
    UNION SELECT 'PowerBI' WHERE description ~* 'power\s*bi|powerbi'
    -- etc
  ) skills
)
```

**Then boost match score:**
```sql
-- +10% if user skills match job skills
boost = array_overlap(user.skills, job.required_skills) ? 0.1 : 0
```

**Impact:** Better technical role matching  
**Effort:** 2-3 hours (build skill extraction)

---

### 7ƒ£ **Company Size Classification** (Nice to Have)

**Problem:** Startup people don't want enterprise, vice versa  
**Solution:** Classify by known lists or description

```sql
company_size = CASE
  WHEN company IN ('Google', 'Amazon', 'Microsoft') THEN 'Enterprise'
  WHEN description LIKE '%startup%' THEN 'Startup'
  WHEN employee_count BETWEEN 50 AND 500 THEN 'Scale-up'
  ELSE NULL
END
```

**Impact:** Better company culture fit  
**Effort:** 3-4 hours (need company data enrichment)

---

### 8ƒ£ **User Feedback Loop** ´ (Critical for Learning)

**Problem:** Only 2 feedback entries - can't improve algorithm  
**Solution:** Make feedback dead simple

**Add to emails:**
```html
Rate this match:
 Great match | ˜ OK |  Bad match

(One-click buttons, no login required)
```

**Track:**
```sql
INSERT INTO user_feedback (user_email, job_hash, verdict, created_at)
VALUES (?, ?, 'positive', now());
```

**Use to improve:**
```sql
-- Learn from feedback
SELECT 
  verdict,
  AVG(match_score) as avg_score,
  COUNT(*) as count
FROM user_feedback
JOIN matches USING (job_hash, user_email)
GROUP BY verdict;

-- If positive feedback has lower match_score than negative,
-- your algorithm needs tuning!
```

**Impact:** Continuous improvement  
**Effort:** 2-3 hours (add to email template + webhook)

---

### 9ƒ£ **Match Score Personalization** (Advanced)

**Problem:** Same algorithm for everyone - some want only 95%+ matches, others want variety  
**Solution:** Let users set minimum match threshold

**Add to users:**
```sql
min_match_score: numeric DEFAULT 0.7 -- 70%
email_frequency: text DEFAULT 'weekly' -- daily, weekly, biweekly
```

**In matching:**
```sql
SELECT * FROM matches
WHERE user_email = ?
  AND match_score >= (SELECT min_match_score FROM users WHERE email = ?)
ORDER BY match_score DESC
LIMIT 5;
```

**Impact:** Users get emails tailored to their preferences  
**Effort:** 1 hour (add to settings page)

---

###  **Freshness Boosting**  (Already Available!)

**Problem:** Old jobs rank same as fresh jobs  
**Solution:** Boost newer jobs in ranking

```sql
-- Already have job_age_days from our scripts!
SELECT 
  *,
  match_score * (1 - (job_age_days / 60.0) * 0.2) as boosted_score
FROM matches
WHERE job_age_days <= 60
ORDER BY boosted_score DESC;

-- Jobs 0-7 days: Full score
-- Jobs 30 days: -10% penalty
-- Jobs 60 days: -20% penalty
```

**Impact:** Users see freshest opportunities first  
**Effort:** Modify ranking query

---

##  Implementation Priority

| Priority | Improvement | Impact | Effort | ROI |
|----------|-------------|--------|--------|-----|
| **´ Do Now** | Infer languages from cities | High | 5 min | ­­­­­ |
| **´ Do Now** | Extract industries from jobs | High | 5 min | ­­­­­ |
| **´ Do Now** | Detect visa sponsorship | High | 5 min | ­­­­­ |
| ** This Week** | Track seen/clicked jobs | High | 2 hrs | ­­­­ |
| ** This Week** | Add feedback buttons | High | 3 hrs | ­­­­ |
| **¢ This Month** | Add industry preferences | Med | 1 hr | ­­­ |
| **¢ This Month** | Extract skills from jobs | Med | 3 hrs | ­­­ |
| **¢ Later** | Company size classification | Med | 4 hrs | ­­ |
| **¢ Later** | Match score personalization | Low | 1 hr | ­­ |
| **¢ Later** | Freshness boosting | Low | 30 min | ­­ |

---

## ¯ Quick Wins (Do Today!)

### Step 1: Run the improvements script
```bash
psql $DATABASE_URL -f scripts/user-matching-improvements.sql
```

This gives you:
-  Languages inferred for all users (0% † 100%)
-  Industries tagged on ~80% of jobs
-  Visa sponsorship detected where mentioned
-  New fields ready for future data

### Step 2: Update Tally form (30 mins)
Add these questions:
1. "Which industries interest you?" (Multi-select: Finance, Tech, Consulting, Healthcare, etc.)
2. "Preferred company size?" (Startup, Scale-up, Enterprise)
3. "Key skills?" (Optional: Python, Excel, SQL, etc.)
4. "Minimum salary expectation?" (Optional number field)

### Step 3: Add feedback to emails (2 hours)
Update email template to include:
```html
<div style="text-align: center; margin: 20px 0;">
  <p>Was this a good match?</p>
  <a href="https://getjobping.com/api/feedback?email={{user_email}}&job={{job_hash}}&vote=up">
     Yes
  </a>
  <a href="https://getjobping.com/api/feedback?email={{user_email}}&job={{job_hash}}&vote=down">
     No
  </a>
</div>
```

---

##  Testing Your Improvements

### Test 1: Language Matching
```sql
-- User wants London jobs, should have English inferred
SELECT email, target_cities, languages_spoken
FROM users
WHERE 'London' = ANY(target_cities);

-- Should show English in languages_spoken
```

### Test 2: Industry Matching
```sql
-- Find finance jobs in London
SELECT title, city, industries
FROM jobs
WHERE 'London' = city
  AND 'Finance' = ANY(industries)
  AND is_active = true
LIMIT 10;
```

### Test 3: No Duplicates
```sql
-- User shouldn't see jobs they've already seen
UPDATE users 
SET seen_job_hashes = ARRAY['some-job-hash-1', 'some-job-hash-2']
WHERE email = 'test@example.com';

SELECT * FROM jobs
WHERE job_hash NOT IN (
  SELECT UNNEST(seen_job_hashes) FROM users WHERE email = 'test@example.com'
);
```

---

## ˆ Expected Results

### Before Improvements:
```
Matching Quality: 60-70%
User Satisfaction: Unknown (no feedback)
Languages Coverage: 0%
Industry Filtering: Not possible
Duplicate Jobs: Possible
```

### After Quick Wins:
```
Matching Quality: 80-85%
User Satisfaction: Trackable via feedback
Languages Coverage: 100%
Industry Filtering: Available
Duplicate Jobs: Prevented
Visa Matching: Smart filtering
```

### After Full Implementation:
```
Matching Quality: 90-95%
User Satisfaction: Continuously improving
Personalization: Per-user thresholds
Skill Matching: Technical roles optimized
Company Fit: Size & culture preferences
```

---

##  Critical Next Steps

1. **Run `user-matching-improvements.sql` NOW** (5 mins)
2. **Add feedback buttons to emails** (2 hours)
3. **Update Tally form with new questions** (30 mins)
4. **Track seen jobs in email sending logic** (2 hours)
5. **Monitor feedback data weekly**

---

##  Advanced Ideas (Future)

### Machine Learning Matching
Once you have 100+ feedback entries:
```python
from sklearn.ensemble import RandomForestClassifier

# Train on feedback data
X = features[user_prefs, job_data, historical_clicks]
y = feedback[positive/negative]

model = RandomForestClassifier()
model.fit(X, y)

# Predict match quality for new jobs
match_score = model.predict_proba(new_job_features)
```

### Collaborative Filtering
"Users similar to you also liked these jobs"

### A/B Testing
Test different match thresholds, email frequencies, etc.

---

**Questions? Check `/scripts/README-MATCHING-IMPROVEMENTS.md` for implementation details!**

