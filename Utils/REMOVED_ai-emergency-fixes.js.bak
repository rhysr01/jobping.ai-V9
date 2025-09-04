// EMERGENCY AI MATCHING PATCH
// Apply this immediately to fix your AI matching

// 1. Fix the OpenAI prompt in your API route
function fixOpenAIPrompt(userCluster, jobs, openai) {
  // Build a much more explicit prompt
  const user = userCluster[0]; // Take first user for now
  
  const jobList = jobs.slice(0, 10).map((job, index) => ({
    index: index + 1,
    title: job.title,
    company: job.company,
    location: job.location,
    hash: job.job_hash,
    categories: Array.isArray(job.categories) ? job.categories.join('|') : job.categories
  }));

  const prompt = `You are a JSON-only response API. Return ONLY valid JSON matching jobs to user.

USER: ${user.professional_expertise || 'Entry-level'} seeking ${user.entry_level_preference || 'entry-level'} roles in ${(user.target_cities || []).join(', ') || 'any location'}.

JOBS:
${jobList.map(job => `${job.index}: ${job.title} at ${job.company} (${job.location}) [${job.hash}]`).join('\n')}

RESPOND WITH ONLY VALID JSON ARRAY:
[{"job_index":1,"job_hash":"${jobList[0]?.hash}","match_score":75,"match_reason":"Entry-level tech role","match_quality":"good","match_tags":"early-career,tech"}]

MAX 5 MATCHES. VALID JSON ONLY. NO OTHER TEXT.`;

  return prompt;
}

// 2. Enhanced response parsing with better error handling
function parseAIResponseRobustly(response, jobs) {
  try {
    // Remove any markdown formatting
    let cleaned = response
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .replace(/^[^[{].*$/gm, '') // Remove non-JSON lines
      .trim();
    
    // Find JSON array or object
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/) || cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    const matches = JSON.parse(cleaned);
    const validMatches = [];
    
    const matchArray = Array.isArray(matches) ? matches : [matches];
    
    for (const match of matchArray.slice(0, 5)) {
      if (match.job_index && match.job_hash && match.match_score) {
        validMatches.push({
          job_index: match.job_index,
          job_hash: match.job_hash,
          match_score: Math.min(100, Math.max(50, match.match_score)),
          match_reason: match.match_reason || 'AI match',
          match_quality: match.match_quality || 'good',
          match_tags: match.match_tags || 'ai-match'
        });
      }
    }
    
    return validMatches;
  } catch (error) {
    console.error('AI parsing failed:', error);
    console.error('Response was:', response.slice(0, 500));
    return [];
  }
}

// 3. Fallback improvement - generate emergency matches
function generateEmergencyMatches(jobs, userPrefs) {
  console.log(`🚨 Emergency matching for ${userPrefs.email}: ${jobs.length} jobs available`);
  
  const matches = [];
  const userCities = userPrefs.target_cities || [];
  const userCareer = userPrefs.career_path?.[0] || '';
  
  for (const job of jobs.slice(0, 10)) {
    let score = 50; // Base score
    let reason = 'Basic match';
    
    // Check categories if they exist
    const categories = Array.isArray(job.categories) ? job.categories : 
                     typeof job.categories === 'string' ? job.categories.split('|') : [];
    
    // Eligibility check
    if (categories.includes('early-career')) {
      score += 30;
      reason = 'Entry-level position';
    }
    
    // Career path check
    if (userCareer && categories.some(cat => cat.includes(userCareer))) {
      score += 20;
      reason = `${userCareer} match`;
    }
    
    // Location check
    if (userCities.length > 0) {
      const jobLocation = job.location?.toLowerCase() || '';
      if (userCities.some(city => jobLocation.includes(city.toLowerCase()))) {
        score += 20;
        reason += ' in target city';
      }
    }
    
    if (score >= 60) {
      matches.push({
        job: job,
        match_score: score,
        match_reason: reason,
        match_quality: score >= 80 ? 'good' : 'fair',
        match_tags: JSON.stringify({
          eligibility: categories.includes('early-career') ? 'early-career' : 'uncertain',
          career: userCareer || 'unknown',
          score: score
        }),
        confidence_score: score >= 70 ? 0.8 : 0.6,
        scoreBreakdown: {
          overall: score,
          eligibility: categories.includes('early-career') ? 100 : 50,
          careerPath: userCareer ? 80 : 40,
          location: 70,
          freshness: 80,
          confidence: 0.7
        }
      });
    }
  }
  
  console.log(`🚨 Emergency matching generated ${matches.length} matches`);
  return matches.slice(0, 6); // Return max 6
}

module.exports = {
  fixOpenAIPrompt,
  parseAIResponseRobustly,
  generateEmergencyMatches
};
