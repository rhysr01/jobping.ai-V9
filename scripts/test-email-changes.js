const { generateJobCard } = require('../Utils/emailUtils.ts');

// Mock job data for testing
const mockJob = {
  id: 'test-123',
  title: 'Graduate Software Engineer',
  company: 'TechCorp',
  location: 'London, UK',
  job_url: 'https://example.com/job',
  description: 'Exciting opportunity for recent graduates...',
  created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  updated_at: new Date().toISOString(),
  job_hash: 'abc123'
};

const mockMatchResult = {
  match_tags: JSON.stringify({
    career_path: 'software-engineering',
    loc: 'london-uk',
    freshness: 'recent'
  }),
  confidence_score: 0.85,
  match_reason: 'Strong match based on your software engineering background and location preferences.'
};

const mockCard = {
  job: mockJob,
  matchResult: mockMatchResult,
  hasManualLocator: false,
  searchHint: null
};

console.log('🧪 Testing Email Changes');
console.log('========================');

// Test the generateJobCard function
try {
  const emailHtml = generateJobCard(mockCard, 0, true, false, 'test@example.com');
  
  console.log('✅ Email generation successful!');
  console.log('\n📧 Generated Email HTML:');
  console.log('========================');
  console.log(emailHtml);
  
  // Check if the new date format is present
  if (emailHtml.includes('Posted 2 days ago')) {
    console.log('\n✅ SUCCESS: New date format is working correctly!');
    console.log('   - Removed freshness tier labels (🆕 <24h, 📅 1-7d, etc.)');
    console.log('   - Added actual posting date: "Posted 2 days ago"');
  } else {
    console.log('\n❌ FAILED: New date format not found in email');
  }
  
  // Check that old freshness tier labels are NOT present
  if (!emailHtml.includes('🆕 <24h') && !emailHtml.includes('📅 1-7d') && !emailHtml.includes('📅 >7d')) {
    console.log('✅ SUCCESS: Old freshness tier labels have been removed!');
  } else {
    console.log('❌ FAILED: Old freshness tier labels are still present');
  }
  
} catch (error) {
  console.error('❌ Email generation failed:', error);
}
