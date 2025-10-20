// Utils/email/textGenerator.ts
// Generate plain text versions of HTML emails

export function htmlToText(html: string): string {
  // Remove all HTML tags and decode entities
  let text = html
    // Remove script and style elements completely
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Replace common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Convert divs and paragraphs to line breaks
    .replace(/<\/?(div|p|br)[^>]*>/gi, '\n')
    // Convert headers to text with spacing
    .replace(/<\/?(h[1-6])[^>]*>/gi, '\n\n')
    // Convert links to [text](url) format
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .replace(/ +/g, ' ');

  return text;
}

export function createWelcomeEmailText(userName?: string, matchCount: number = 10, tier: 'free' | 'premium' = 'free'): string {
  const weeklyInfo = tier === 'premium'
    ? 'Premium Plan: Your first 10 roles + 15 roles per week (Mon/Wed/Fri) + 24-hour early access'
    : 'Free Plan: Your first 10 roles + 5 new roles every week';
    
  return `JobPing - AI-Powered Job Matching for Europe

Welcome${userName ? `, ${userName}` : ''}!

Your AI career assistant is finding your perfect matches.

✅ Your First ${matchCount} Roles Arriving in 48 Hours

You'll automatically receive your first ${matchCount} hand-picked roles within 48 hours—no spam, just quality opportunities matched to your profile.

⚠️ CHECK YOUR SPAM FOLDER
Our emails sometimes land in spam/junk. Check there if you don't see them in your inbox!

What happens next?
${weeklyInfo}

Sit back and relax. We'll send your matches automatically—no action needed!

---

You're receiving this because you signed up for JobPing.

Unsubscribe: https://www.getjobping.com/legal/unsubscribe
}

export function createJobMatchesEmailText(
  jobs: any[],
  userName?: string,
  subscriptionTier: 'free' | 'premium' = 'free',
  isSignupEmail: boolean = false,
  personalization?: {
    role?: string;
    location?: string;
    salaryRange?: string;
    dayText?: string;
    entryLevelLabel?: string;
  }
): string {
  const premium = subscriptionTier === 'premium' ? '⭐ Premium Member\n\n' : '';
  const greeting = isSignupEmail ? 'Welcome! Here are your first' : 'Your fresh';
  
  const header = `JobPing - AI-Powered Job Matching for EU Tech

${premium}Hi ${userName || 'there'} 👋

${personalization?.dayText || personalization?.role ? `${personalization?.dayText ? `${personalization.dayText}'s` : 'Your'} ${personalization?.role || ''} matches${personalization?.location ? ` in ${personalization.location}` : ''}\n\n` : ''}${greeting} ${jobs.length} ${personalization?.location ? `${personalization.location} ` : ''}AI-curated job matches${personalization?.salaryRange || personalization?.entryLevelLabel ? `\n${[personalization.entryLevelLabel, personalization.salaryRange].filter(Boolean).join(' • ')}` : ''}

---

JOB MATCHES:
`;

  const jobsText = jobs.map((job, index) => {
    const matchScore = job.match_score || job.matchResult?.match_score || 85;
    const trending = matchScore >= 90 ? '🔥 Trending\n' : '';
    
    return `${index + 1}. ${trending}${job.title || 'Job Title'}
   Company: ${job.company || 'Company'}
   Location: ${job.location || 'Location'}
   Match: ${matchScore}% | Salary: ${job.salary || 'Unknown'} | Type: ${job.job_type || 'Unknown'}
   
   ${job.description && job.description.trim() ? 
     (job.description.length > 150 ? job.description.substring(0, 150) + '...' : job.description) :
     'Description: Unknown'
   }
   
   Feedback: https://www.getjobping.com/api/feedback/email?job=${job.job_hash || 'unknown'}&email=${encodeURIComponent(job.user_email || '')}
`;
  }).join('\n');

  const footer = `

${personalization?.role || personalization?.location || personalization?.salaryRange ? 
  `These matches are based on your preferences: ${[personalization.location, personalization.role, personalization.salaryRange, personalization.entryLevelLabel].filter(Boolean).join(', ')}\n\n` : 
  ''
}---

You're receiving this because you signed up for JobPing.
Fresh matches delivered automatically to your inbox weekly.

Unsubscribe: https://www.getjobping.com/legal/unsubscribe`;

  return header + jobsText + footer;
}