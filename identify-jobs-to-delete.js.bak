import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function identifyJobsToDelete() {
  try {
    console.log('🔍 IDENTIFYING JOBS TO DELETE - CONSERVATIVE APPROACH');
    console.log('='.repeat(55));
    console.log('⚠️  ONLY removing OBVIOUS senior/irrelevant roles');
    console.log('✅ When in doubt, we KEEP the job');
    console.log('');
    
    // Get all jobs to analyze
    const { data: allJobs, error } = await supabase
      .from('jobs')
      .select('id, title, company, location, description, experience_required')
      .order('created_at', { ascending: false })
      .limit(15000);
    
    if (error) throw error;
    
    console.log(`📊 Analyzing ${allJobs.length} jobs for deletion candidates...`);
    
    // Define CLEARLY senior/irrelevant terms (very conservative)
    const DEFINITELY_SENIOR_TERMS = [
      // Executive/Leadership roles
      'chief executive', 'chief operating', 'chief financial', 'chief technology', 'chief marketing',
      'ceo', 'coo', 'cfo', 'cto', 'cmo', 'chief', 'president', 'vice president', 'vp ',
      'head of', 'director of', 'managing director', 'executive director',
      'senior director', 'principal director', 'global director',
      
      // Very senior management
      'senior manager', 'senior management', 'department head', 'team lead', 
      'senior leader', 'senior executive', 'executive manager',
      'senior partner', 'managing partner', 'principal consultant',
      
      // Clearly senior experience levels
      'senior level', 'executive level', 'leadership level',
      '10+ years', '15+ years', '20+ years', 'decade of experience',
      
      // Non-business school relevant (manual/technical)
      'truck driver', 'delivery driver', 'warehouse worker', 'factory worker',
      'construction worker', 'electrician', 'plumber', 'mechanic', 
      'cleaner', 'janitor', 'security guard', 'cashier',
      'nurse', 'doctor', 'surgeon', 'medical', 'healthcare worker',
      'teacher', 'professor', 'academic', 'librarian',
      'chef', 'cook', 'waiter', 'bartender', 'server',
      
      // Very technical senior roles
      'senior software engineer', 'principal engineer', 'staff engineer',
      'senior developer', 'lead developer', 'architect',
      'senior data scientist', 'principal scientist'
    ];
    
    const DEFINITELY_NOT_BUSINESS_SCHOOL = [
      // Healthcare
      'nursing', 'medical assistant', 'hospital', 'clinic', 'pharmacy',
      'healthcare', 'patient care', 'clinical', 'surgical',
      
      // Education  
      'teaching', 'university lecturer', 'academic research', 'school',
      
      // Manual labor
      'manufacturing', 'production line', 'assembly', 'packaging',
      'warehouse', 'logistics coordinator', 'delivery', 'transportation',
      'construction', 'maintenance', 'repair', 'installation',
      
      // Service industry
      'restaurant', 'hospitality', 'hotel', 'tourism', 'retail sales',
      'customer service representative', 'call center', 'reception'
    ];
    
    // Identify jobs to delete (very conservative)
    const jobsToDelete = allJobs.filter(job => {
      const title = job.title.toLowerCase();
      const description = (job.description || '').toLowerCase();
      const experience = (job.experience_required || '').toLowerCase();
      
      // Check for DEFINITELY senior terms in title (most reliable)
      const hasSeniorTitle = DEFINITELY_SENIOR_TERMS.some(term => 
        title.includes(term.toLowerCase())
      );
      
      // Check for DEFINITELY not business school in title or description
      const isNotBusinessSchool = DEFINITELY_NOT_BUSINESS_SCHOOL.some(term =>
        title.includes(term.toLowerCase()) || description.includes(term.toLowerCase())
      );
      
      // Check for very obvious senior experience requirements
      const hasSeniorExperience = experience.includes('10+ years') || 
                                  experience.includes('15+ years') ||
                                  experience.includes('senior level') ||
                                  experience.includes('executive level');
      
      return hasSeniorTitle || isNotBusinessSchool || hasSeniorExperience;
    });
    
    console.log(`🎯 Found ${jobsToDelete.length} jobs to delete (${((jobsToDelete.length/allJobs.length)*100).toFixed(1)}%)`);
    
    // Categorize deletions for review
    const seniorRoles = jobsToDelete.filter(job => {
      const title = job.title.toLowerCase();
      return DEFINITELY_SENIOR_TERMS.some(term => title.includes(term.toLowerCase()));
    });
    
    const irrelevantRoles = jobsToDelete.filter(job => {
      const title = job.title.toLowerCase();
      const description = (job.description || '').toLowerCase();
      return DEFINITELY_NOT_BUSINESS_SCHOOL.some(term =>
        title.includes(term.toLowerCase()) || description.includes(term.toLowerCase())
      );
    });
    
    console.log(`\n📋 DELETION BREAKDOWN:`);
    console.log(`  🎖️  Senior/Executive roles: ${seniorRoles.length}`);
    console.log(`  🚫 Non-business school: ${irrelevantRoles.length}`);
    
    // Show samples for review
    console.log(`\n🔍 SAMPLE SENIOR ROLES TO DELETE:`);
    seniorRoles.slice(0, 10).forEach((job, i) => {
      console.log(`  ${i+1}. "${job.title}" at ${job.company}`);
    });
    
    console.log(`\n🔍 SAMPLE IRRELEVANT ROLES TO DELETE:`);
    irrelevantRoles.slice(0, 10).forEach((job, i) => {
      console.log(`  ${i+1}. "${job.title}" at ${job.company}`);
    });
    
    // Safety check - make sure we're not deleting too much
    if (jobsToDelete.length > allJobs.length * 0.3) {
      console.log(`\n⚠️  WARNING: Planning to delete ${((jobsToDelete.length/allJobs.length)*100).toFixed(1)}% of jobs`);
      console.log(`   This seems too high - review the criteria!`);
      return;
    }
    
    console.log(`\n✅ CONSERVATIVE DELETION PLAN:`);
    console.log(`   📊 Keep: ${allJobs.length - jobsToDelete.length} jobs (${(((allJobs.length - jobsToDelete.length)/allJobs.length)*100).toFixed(1)}%)`);
    console.log(`   🗑️  Delete: ${jobsToDelete.length} jobs (${((jobsToDelete.length/allJobs.length)*100).toFixed(1)}%)`);
    console.log(`   🎯 Focus: Business school graduates & students`);
    
    // Return the IDs for deletion
    return jobsToDelete.map(job => job.id);
    
  } catch (error) {
    console.error('❌ Job identification failed:', error.message);
    return [];
  }
}

// Export for use in deletion script
export { identifyJobsToDelete };

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const idsToDelete = await identifyJobsToDelete();
  console.log(`\n📝 READY TO DELETE: ${idsToDelete.length} job IDs identified`);
}
