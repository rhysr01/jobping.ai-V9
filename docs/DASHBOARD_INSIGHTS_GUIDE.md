# System Health Dashboard - Additional Insights Guide

## Overview
This document outlines the SQL views created for the Lovable dashboard and suggests additional metrics that would provide valuable insights into your job matching system.

## Created Views

### 1. `category_performance_report`
**What it shows:** Match volume, quality scores, and distribution per job category  
**Use case:** Identify which categories the AI handles well vs poorly  
**Key metrics:**
- Total matches per category
- Average and median match scores
- High/low quality match percentages

**Dashboard visualization:** Bar chart comparing avg_match_score across categories

---

### 2. `ai_matching_quality_report`
**What it shows:** Daily AI performance metrics  
**Use case:** Monitor AI costs, latency, and reliability  
**Key metrics:**
- Success rate (AI matches vs fallbacks)
- Average latency
- Total cost per day
- Cache hit rate

**Dashboard visualization:** Line chart showing daily costs and latency trends

---

### 3. `user_engagement_summary`
**What it shows:** User activity and satisfaction  
**Use case:** Track product health and user satisfaction  
**Key metrics:**
- Active users per day
- Positive vs negative interaction ratio
- Satisfaction rate

**Dashboard visualization:** Area chart showing active users and satisfaction rate over time

---

### 4. `match_quality_by_category`
**What it shows:** Detailed quality breakdown by category  
**Use case:** Deep dive into category performance  
**Key metrics:**
- Match score distributions
- High/low quality match counts
- Quality rate percentages

**Dashboard visualization:** Heatmap showing categories with quality rates

---

### 5. `category_noise_report`
**What it shows:** Categories with poor performance  
**Use case:** Prioritize areas for AI improvement  
**Key metrics:**
- Priority level (HIGH/MEDIUM/LOW)
- Low quality match counts
- Average scores below threshold

**Dashboard visualization:** Table with color-coded priority levels (red/yellow/green)

---

### 6. `job_source_performance`
**What it shows:** Which scrapers provide best matches  
**Use case:** Optimize scraper priorities and allocation  
**Key metrics:**
- Total jobs per source
- Match rate percentage
- Average match quality per source

**Dashboard visualization:** Stacked bar chart showing source contribution and quality

---

### 7. `daily_system_health`
**What it shows:** Quick health snapshot  
**Use case:** Daily monitoring at a glance  
**Key metrics:**
- Matches, users, jobs today
- Average match score
- AI costs and fallbacks

**Dashboard visualization:** Metric cards (KPI dashboard)

---

## Additional Insights You Should Add

### 1. **User Retention & Growth**
```sql
-- Weekly active users (WAU) and monthly active users (MAU)
CREATE OR REPLACE VIEW user_retention_metrics AS
SELECT 
    DATE_TRUNC('week', created_at) as week,
    COUNT(DISTINCT user_email) as wau,
    COUNT(DISTINCT user_email) FILTER (
        WHERE created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
    ) as mau_from_previous_month,
    COUNT(*) as total_matches
FROM matches
WHERE created_at >= NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;
```
**Why:** Track if users are coming back and if the product is growing

---

### 2. **Match Score Distribution**
```sql
-- See the full distribution of match scores (identify if scores are too clustered)
CREATE OR REPLACE VIEW match_score_distribution AS
SELECT 
    CASE 
        WHEN match_score::numeric >= 0.9 THEN '0.9-1.0'
        WHEN match_score::numeric >= 0.8 THEN '0.8-0.9'
        WHEN match_score::numeric >= 0.7 THEN '0.7-0.8'
        WHEN match_score::numeric >= 0.6 THEN '0.6-0.7'
        ELSE '<0.6'
    END as score_bucket,
    COUNT(*) as count,
    ROUND(COUNT(*)::float / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM matches
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY score_bucket
ORDER BY score_bucket DESC;
```
**Why:** Ensure scores are well-distributed (not all 0.95 or all 0.5)

---

### 3. **Time-to-Match Performance**
```sql
-- How long does it take from job posting to match?
CREATE OR REPLACE VIEW time_to_match_performance AS
SELECT 
    DATE_TRUNC('day', m.created_at) as match_date,
    AVG(EXTRACT(EPOCH FROM (m.created_at - j.posted_at)) / 3600) as avg_hours_to_match,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (m.created_at - j.posted_at)) / 3600) as median_hours_to_match,
    COUNT(*) as matches
FROM matches m
JOIN jobs j ON m.job_hash = j.job_hash
WHERE j.posted_at IS NOT NULL
  AND m.created_at >= j.posted_at
  AND m.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', m.created_at)
ORDER BY match_date DESC;
```
**Why:** Ensure you're matching users to fresh jobs quickly

---

### 4. **Geographic Performance**
```sql
-- Which locations have best match quality?
CREATE OR REPLACE VIEW geographic_performance AS
SELECT 
    j.country,
    COUNT(*) as total_matches,
    ROUND(AVG(m.match_score::numeric), 2) as avg_score,
    COUNT(DISTINCT m.user_email) as matched_users
FROM matches m
JOIN jobs j ON m.job_hash = j.job_hash
WHERE j.country IS NOT NULL
  AND m.created_at >= NOW() - INTERVAL '30 days'
GROUP BY j.country
ORDER BY avg_score DESC, total_matches DESC;
```
**Why:** Identify geographic markets where matching excels or struggles

---

### 5. **AI Model Comparison**
```sql
-- Compare different AI models (if you use multiple)
CREATE OR REPLACE VIEW ai_model_comparison AS
SELECT 
    ai_model,
    COUNT(*) as total_matches,
    ROUND(AVG(match_score::numeric), 2) as avg_score,
    ROUND(AVG(ai_latency_ms), 0) as avg_latency_ms,
    ROUND(SUM(ai_cost_usd), 4) as total_cost,
    ROUND(AVG(ai_cost_usd), 6) as avg_cost_per_match,
    COUNT(*) FILTER (WHERE fallback_reason IS NOT NULL) as fallback_count
FROM matches
WHERE ai_model IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY ai_model
ORDER BY avg_score DESC;
```
**Why:** Optimize AI model selection (quality vs cost tradeoff)

---

### 6. **User Segment Performance**
```sql
-- How do different user segments perform? (career stage, experience level)
CREATE OR REPLACE VIEW user_segment_performance AS
SELECT 
    u.professional_experience,
    u.career_path,
    COUNT(DISTINCT m.user_email) as users,
    COUNT(*) as total_matches,
    ROUND(AVG(m.match_score::numeric), 2) as avg_score
FROM matches m
JOIN users u ON m.user_email = u.email
WHERE m.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.professional_experience, u.career_path
ORDER BY avg_score DESC;
```
**Why:** Identify which user segments get better matches (product-market fit signal)

---

### 7. **Email Engagement Metrics** (if you have email tracking)
```sql
-- Email open and click rates by user segment
CREATE OR REPLACE VIEW email_engagement_by_segment AS
SELECT 
    u.professional_experience,
    COUNT(DISTINCT u.email) as users_with_emails,
    AVG(u.email_engagement_score) as avg_engagement_score,
    COUNT(DISTINCT u.email) FILTER (WHERE u.last_email_opened IS NOT NULL) as users_opened,
    COUNT(DISTINCT u.email) FILTER (WHERE u.last_email_clicked IS NOT NULL) as users_clicked
FROM users u
WHERE u.last_email_sent >= NOW() - INTERVAL '30 days'
GROUP BY u.professional_experience
ORDER BY avg_engagement_score DESC;
```
**Why:** Understand email channel effectiveness per user segment

---

### 8. **Job Age vs Match Quality**
```sql
-- Do older jobs get worse matches?
CREATE OR REPLACE VIEW job_age_vs_quality AS
SELECT 
    CASE 
        WHEN EXTRACT(EPOCH FROM (NOW() - j.posted_at)) / 86400 <= 1 THEN '0-1 days'
        WHEN EXTRACT(EPOCH FROM (NOW() - j.posted_at)) / 86400 <= 7 THEN '2-7 days'
        WHEN EXTRACT(EPOCH FROM (NOW() - j.posted_at)) / 86400 <= 30 THEN '8-30 days'
        ELSE '30+ days'
    END as job_age_category,
    COUNT(*) as matches,
    ROUND(AVG(m.match_score::numeric), 2) as avg_score,
    COUNT(DISTINCT m.user_email) as matched_users
FROM matches m
JOIN jobs j ON m.job_hash = j.job_hash
WHERE j.posted_at IS NOT NULL
  AND m.created_at >= NOW() - INTERVAL '30 days'
GROUP BY job_age_category
ORDER BY job_age_category;
```
**Why:** Ensure match quality doesn't degrade for older jobs

---

## Lovable Dashboard Prompt

Here's the complete prompt to give Lovable for building your dashboard:

```
Build a System Health Dashboard for my job matching AI engine. Connect it to my Supabase database.

The dashboard should include:

1. **Key Metrics Cards (Top Row):**
   - Total Matches Today
   - Active Users Today  
   - Average Match Score (last 30 days)
   - Total AI Cost (last 30 days)
   Use the `daily_system_health` view

2. **Category Performance Chart:**
   - Bar chart comparing avg_match_score across all categories
   - Use `category_performance_report` view
   - Color bars: Green (>0.75), Yellow (0.65-0.75), Red (<0.65)

3. **AI Quality Trends:**
   - Line chart showing daily AI cost and average latency
   - Use `ai_matching_quality_report` view
   - Dual Y-axis: cost (left), latency (right)

4. **"Noise" Categories Table:**
   - Data table showing categories with poor performance
   - Use `category_noise_report` view
   - Sort by priority (HIGH_PRIORITY first)
   - Color-code priority column

5. **Source Performance:**
   - Stacked bar chart showing job sources
   - Use `job_source_performance` view
   - Show total_jobs and avg_match_score

6. **User Engagement:**
   - Area chart showing daily active users and satisfaction rate
   - Use `user_engagement_summary` view

Styling:
- Dark mode theme (black/zinc background)
- Emerald accents for positive metrics
- Rose/red for warnings/negative metrics
- Clean, professional design (like Vercel Analytics or Linear)
- Use Recharts or Tremor for charts
- Make it responsive for mobile

Layout:
- Top: Key metrics cards (4 columns on desktop, 2x2 on mobile)
- Middle: Category performance chart (full width)
- Bottom: Two columns (left: AI trends, right: Noise table)
- Below: Source performance and engagement charts
```

---

## Next Steps

1. **Run the migration:** Execute `create_dashboard_views.sql` in Supabase SQL Editor
2. **Add job_hash to match_logs:** Run the migration included in the SQL file to enable CTR/Apply tracking
3. **Build in Lovable:** Use the prompt above to generate the dashboard
4. **Iterate:** Add the additional views above as you identify which metrics matter most

---

## Pro Tips

- **Start simple:** Build the basic dashboard first (metrics cards + category chart)
- **Add views incrementally:** Don't try to visualize everything at once
- **Set up alerts:** Use the `daily_system_health` view to set up alerts for:
  - AI costs exceeding daily budget
  - Fallback rate > 10%
  - Average match score < 0.7
- **Schedule reviews:** Review the dashboard weekly to identify trends
- **Share with team:** This dashboard proves data-driven decision making

