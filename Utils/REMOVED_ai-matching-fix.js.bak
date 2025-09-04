// CRITICAL FIX: AI Matching Prompt Engineering
// This addresses the JSON parsing issue

function buildFixedMatchingPrompt(jobs, userPrefs) {
  const userCareerPath = userPrefs.career_path?.[0] || 'unknown';
  const topCities = (userPrefs.target_cities || []).slice(0, 3);
  const eligibilityNotes = userPrefs.entry_level_preference || 'entry-level';
  
  const jobList = jobs.map((job, index) => {
    const categories = Array.isArray(job.categories) ? job.categories.join(', ') : job.categories || '';
    const location = job.location || '';
    return `${index + 1}. ${job.title} at ${job.company} (${location}) - Hash: ${job.job_hash}`;
  }).join('\n');

  return `CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no explanations, no additional text.

USER PROFILE:
Career: ${userCareerPath}
Cities: ${topCities.join(', ')}
Level: ${eligibilityNotes}
Work: ${userPrefs.work_environment || 'any'}

JOBS:
${jobList}

RESPOND WITH ONLY THIS EXACT JSON FORMAT:
[
  {
    "job_index": 1,
    "job_hash": "actual-job-hash-here",
    "match_score": 85,
    "match_reason": "Career path match in target city",
    "match_quality": "good",
    "match_tags": "career:tech,loc:madrid,early-career"
  }
]

REQUIREMENTS:
- Return EXACTLY 3-5 matches maximum
- job_index: 1-${jobs.length}
- match_score: 50-100 (integer)
- Use actual job_hash from jobs above
- Response must be valid JSON only
- No text before or after JSON`;
}

// Export for use in your API
module.exports = { buildFixedMatchingPrompt };
