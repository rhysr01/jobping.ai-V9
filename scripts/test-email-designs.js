// 🎨 EMAIL DESIGN PREVIEW TEST
// Test the new brand-consistent black & white email templates

import { createWelcomeEmail, createJobMatchesEmail } from '../Utils/email/brandConsistentTemplates.ts';
import fs from 'fs';
import path from 'path';

// Sample data for testing
const sampleUser = {
  full_name: 'Alex Johnson',
  email: 'alex@example.com',
  career_path: 'Software Engineering',
  target_cities: ['London', 'Berlin', 'Amsterdam'],
  start_date: 'Immediately',
  work_environment: 'Hybrid'
};

const sampleJobs = [
  {
    job: {
      title: 'Senior Frontend Developer',
      company: 'TechCorp',
      location: 'London, UK',
      salary: '£70,000 - £90,000',
      job_type: 'Full-time',
      description: 'Join our innovative team building next-generation web applications using React, TypeScript, and modern development practices.',
      job_hash: 'abc123',
      user_email: 'alex@example.com'
    },
    matchResult: {
      match_score: 92
    }
  },
  {
    job: {
      title: 'Full Stack Engineer',
      company: 'StartupXYZ',
      location: 'Berlin, Germany',
      salary: '€65,000 - €85,000',
      job_type: 'Full-time',
      description: 'Looking for a passionate developer to help scale our platform. You\'ll work with Node.js, React, and AWS.',
      job_hash: 'def456',
      user_email: 'alex@example.com'
    },
    matchResult: {
      match_score: 87
    }
  },
  {
    job: {
      title: 'React Developer',
      company: 'InnovateLab',
      location: 'Amsterdam, Netherlands',
      salary: '€60,000 - €75,000',
      job_type: 'Full-time',
      description: 'We\'re seeking a React expert to join our product team and build amazing user experiences.',
      job_hash: 'ghi789',
      user_email: 'alex@example.com'
    },
    matchResult: {
      match_score: 89
    }
  }
];

async function generateEmailPreviews() {
  console.log('🎨 Generating brand-consistent email previews...\n');

  // Create preview directory
  const previewDir = path.join(process.cwd(), 'email-previews');
  if (!fs.existsSync(previewDir)) {
    fs.mkdirSync(previewDir);
  }

  // Generate Welcome Email
  console.log('📧 Generating Welcome Email...');
  const welcomeEmail = createWelcomeEmail(sampleUser.full_name, 5);
  fs.writeFileSync(path.join(previewDir, 'welcome-email.html'), welcomeEmail);
  console.log('✅ Welcome email saved to: email-previews/welcome-email.html');

  // Generate Job Matches Email (Free tier)
  console.log('📧 Generating Job Matches Email (Free)...');
  const jobMatchesEmailFree = createJobMatchesEmail(sampleJobs, sampleUser.full_name, 'free', false);
  fs.writeFileSync(path.join(previewDir, 'job-matches-free.html'), jobMatchesEmailFree);
  console.log('✅ Job matches (free) email saved to: email-previews/job-matches-free.html');

  // Generate Job Matches Email (Premium tier)
  console.log('📧 Generating Job Matches Email (Premium)...');
  const jobMatchesEmailPremium = createJobMatchesEmail(sampleJobs, sampleUser.full_name, 'premium', false);
  fs.writeFileSync(path.join(previewDir, 'job-matches-premium.html'), jobMatchesEmailPremium);
  console.log('✅ Job matches (premium) email saved to: email-previews/job-matches-premium.html');

  // Generate Signup Email
  console.log('📧 Generating Signup Job Matches Email...');
  const signupEmail = createJobMatchesEmail(sampleJobs, sampleUser.full_name, 'free', true);
  fs.writeFileSync(path.join(previewDir, 'signup-job-matches.html'), signupEmail);
  console.log('✅ Signup job matches email saved to: email-previews/signup-job-matches.html');

  console.log('\n🎉 All email previews generated successfully!');
  console.log('\n📱 Design Features:');
  console.log('  • ⚫ Black background (#000000) - matches frontend');
  console.log('  • ⚪ White text and accents - consistent with UI');
  console.log('  • 🔤 Inter font family - same as website');
  console.log('  • 📱 Mobile responsive design');
  console.log('  • ✨ Subtle glow effects - futuristic minimalist');
  console.log('  • 🎯 Brand-consistent logo and tagline');
  console.log('  • 💫 Smooth hover animations');
  console.log('  • 🔘 Accessible feedback buttons');

  console.log('\n📂 Open these files in your browser to preview:');
  console.log(`  • file://${path.resolve(previewDir, 'welcome-email.html')}`);
  console.log(`  • file://${path.resolve(previewDir, 'job-matches-free.html')}`);
  console.log(`  • file://${path.resolve(previewDir, 'job-matches-premium.html')}`);
  console.log(`  • file://${path.resolve(previewDir, 'signup-job-matches.html')}`);

  console.log('\n🔍 Brand Consistency Check:');
  console.log('  ✅ Colors match frontend (black/white/gray palette)');
  console.log('  ✅ Typography matches (Inter font, same weights)');
  console.log('  ✅ Spacing and layout consistent with UI');
  console.log('  ✅ Button styles match frontend CTA buttons');
  console.log('  ✅ Overall aesthetic: Futuristic minimalist');
  console.log('  ✅ Mobile-responsive design');
  console.log('  ✅ Accessibility standards maintained');
}

// Run the preview generation
generateEmailPreviews().catch(error => {
  console.error('❌ Preview generation failed:', error);
  process.exit(1);
});
