#!/usr/bin/env node

// Fresh Muse scraper with direct multilingual early career detection
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Fresh copy of the multilingual early career detection function
function classifyEarlyCareerFresh(job) {
  const { title, description } = job;
  const text = `${title} ${description}`;
  
  // ✅ COMPREHENSIVE: Multilingual early career detection
  const graduateRegex = /(graduate|new.?grad|recent.?graduate|campus.?hire|graduate.?scheme|graduate.?program|rotational.?program|university.?hire|college.?hire|entry.?level|junior|trainee|intern|internship|placement|analyst|assistant|fellowship|apprenticeship|apprentice|stagiaire|alternant|alternance|d[ée]butant|formation|dipl[oô]m[eé]|apprenti|poste.?d.?entr[ée]e|niveau.?d[ée]butant|praktikum|praktikant|traineeprogramm|berufseinstieg|absolvent|absolventenprogramm|ausbildung|auszubildende|werkstudent|einsteiger|becario|pr[aá]cticas|programa.?de.?graduados|reci[eé]n.?titulado|aprendiz|nivel.?inicial|puesto.?de.?entrada|j[uú]nior|formaci[oó]n.?dual|tirocinio|stagista|apprendista|apprendistato|neolaureato|formazione|inserimento.?lavorativo|stage|stagiair|starterfunctie|traineeship|afgestudeerde|leerwerkplek|instapfunctie|fresher|nyuddannet|nyutdannet|nyexaminerad|neo.?laureato|nuovo.?laureato|recién.?graduado|nuevo.?graduado|joven.?profesional|nieuwe.?medewerker)/i;
  
  // ✅ FIXED: More precise senior role exclusion - don't exclude "specialist" or "expert" in junior roles
  const seniorRegex = /(senior|lead|principal|manager|director|head.?of|vp|chief|executive|5\+.?years|7\+.?years|10\+.?years|experienced|architect|consultant|advisory|strategic|executive|management|team.?lead|tech.?lead|staff|distinguished)/i;
  
  // ✅ FIXED: Only exclude roles requiring significant experience (3+ years), not 1-2 years
  const experienceRegex = /(proven.?track.?record|extensive.?experience|minimum.?3.?years|minimum.?5.?years|minimum.?7.?years|prior.?experience|relevant.?experience|3\+.?years|5\+.?years|7\+.?years|10\+.?years)/i;
  
  return graduateRegex.test(text) && !seniorRegex.test(text) && !experienceRegex.test(text);
}

async function testMuseWithFixedFunction() {
  console.log('🔍 Testing Muse API with fixed multilingual early career detection...');
  
  try {
    // Get jobs from Muse API - NO CATEGORY OR LEVEL FILTERS
    const response = await axios.get('https://www.themuse.com/api/public/jobs', {
      params: {
        location: 'London',
        page: 1,
        descending: true
        // NO categories or levels parameters - get ALL jobs
      }
    });
    
    const jobs = response.data.results || [];
    console.log(`📊 Found ${jobs.length} jobs from Muse API (no filters)`);
    
    let earlyCareerJobs = [];
    let skippedJobs = [];
    
    console.log('\n🧪 Testing each job with fresh multilingual detection:');
    
    for (const job of jobs) {
      const ingestJob = {
        title: job.name,
        company: job.company.name,
        location: job.locations?.[0]?.name || job.company.locations?.[0]?.name || 'Remote',
        description: job.contents || '',
        url: job.refs?.landing_page || '',
        posted_at: job.publication_date || '',
        source: 'muse'
      };
      
      // Use our fresh function
      const isEarlyCareer = classifyEarlyCareerFresh(ingestJob);
      
      if (isEarlyCareer) {
        earlyCareerJobs.push(ingestJob);
        console.log(`✅ EARLY CAREER: ${ingestJob.title} at ${ingestJob.company}`);
      } else {
        skippedJobs.push(ingestJob);
        console.log(`🚫 SKIPPED: ${ingestJob.title} at ${ingestJob.company}`);
      }
    }
    
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Early career jobs found: ${earlyCareerJobs.length}`);
    console.log(`   🚫 Jobs skipped: ${skippedJobs.length}`);
    console.log(`   📈 Success rate: ${Math.round((earlyCareerJobs.length / jobs.length) * 100)}%`);
    
    if (earlyCareerJobs.length > 0) {
      console.log('\n🎯 Early career jobs found:');
      earlyCareerJobs.forEach((job, i) => {
        console.log(`   ${i+1}. ${job.title} at ${job.company} (${job.location})`);
      });
    }
    
    return { earlyCareerJobs, totalJobs: jobs.length };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { earlyCareerJobs: [], totalJobs: 0 };
  }
}

if (require.main === module) {
  testMuseWithFixedFunction();
}

module.exports = { testMuseWithFixedFunction, classifyEarlyCareerFresh };
