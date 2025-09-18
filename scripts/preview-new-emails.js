// 🎨 EMAIL DESIGN PREVIEW - Brand Consistent Black & White
// Creates HTML files to preview the new email designs

import fs from 'fs';
import path from 'path';

// Brand-consistent CSS matching frontend design
const BRAND_CSS = `
body {
  margin: 0;
  padding: 20px;
  background: #000000;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  line-height: 1.5;
  color: #FFFFFF;
  -webkit-font-smoothing: antialiased;
}
.container {
  max-width: 600px;
  margin: 0 auto;
  background: #0A0A0A;
  border: 1px solid #1A1A1A;
  border-radius: 12px;
  overflow: hidden;
}
.header {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-bottom: 1px solid #1A1A1A;
  padding: 32px 24px;
  text-align: center;
}
.logo {
  font-size: 28px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 8px;
}
.tagline {
  color: #888888;
  font-size: 14px;
}
.content {
  padding: 32px 24px;
}
.title {
  font-size: 24px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 16px;
  text-align: center;
}
.text {
  color: #888888;
  margin-bottom: 16px;
  line-height: 1.6;
  text-align: center;
}
.highlight-box {
  background: #111111;
  border: 1px solid #333333;
  padding: 24px;
  border-radius: 8px;
  margin: 24px 0;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
}
.cta-button {
  display: inline-block;
  background: #FFFFFF;
  color: #000000;
  padding: 16px 32px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  font-size: 16px;
  margin: 24px auto;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
  display: block;
  text-align: center;
  max-width: 280px;
}
.cta-button:hover {
  background: #CCCCCC;
  transform: translateY(-2px);
}
.job-card {
  background: #111111;
  border: 1px solid #1A1A1A;
  border-radius: 12px;
  padding: 24px;
  margin: 16px 0;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
}
.job-title {
  font-size: 18px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 8px;
}
.job-company {
  color: #CCCCCC;
  font-weight: 500;
  margin-bottom: 4px;
}
.job-location {
  color: #888888;
  font-size: 14px;
  margin-bottom: 16px;
}
.match-score {
  background: #FFFFFF;
  color: #000000;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
}
`;

function createWelcomeEmail() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to JobPing</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>${BRAND_CSS}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🎯 JobPing</div>
      <div class="tagline">AI-Powered Career Intelligence</div>
    </div>
    
    <div class="content">
      <h1 class="title">Welcome, Alex! 🚀</h1>
      <p class="text">Your AI career assistant is now active and ready to revolutionize your job search.</p>
      
      <div class="highlight-box">
        <h3 style="color: #FFFFFF; margin-bottom: 16px;">🎯 5 AI-curated job matches found and analyzed</h3>
        <p style="color: #888888; margin: 0;">We'll send personalized, high-quality opportunities every 48 hours based on your profile.</p>
      </div>
      
      <a href="https://jobping.ai/dashboard" class="cta-button">
        View Your Matches →
      </a>
      
      <div style="text-align: center; margin-top: 24px;">
        <h3 style="color: #FFFFFF; font-size: 18px; margin-bottom: 16px;">What makes JobPing different?</h3>
        <div style="text-align: left; max-width: 400px; margin: 0 auto;">
          <p style="color: #888888; font-size: 14px; margin-bottom: 8px;">
            🤖 <strong style="color: #FFFFFF;">AI-Powered Matching:</strong> Advanced algorithms analyze job fit
          </p>
          <p style="color: #888888; font-size: 14px; margin-bottom: 8px;">
            🎯 <strong style="color: #FFFFFF;">Quality Over Quantity:</strong> Only relevant, high-quality positions
          </p>
          <p style="color: #888888; font-size: 14px; margin-bottom: 8px;">
            ⚡ <strong style="color: #FFFFFF;">Real-Time Updates:</strong> Fresh opportunities every 48 hours
          </p>
          <p style="color: #888888; font-size: 14px;">
            🚀 <strong style="color: #FFFFFF;">Career Intelligence:</strong> Insights to accelerate your growth
          </p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function createJobMatchesEmail() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Job Matches - JobPing</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>${BRAND_CSS}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🎯 JobPing</div>
      <div class="tagline">AI-Powered Career Intelligence</div>
    </div>
    
    <div class="content">
      <h1 class="title">Hi Alex 👋</h1>
      <p class="text">Your fresh 3 AI-curated job matches based on your profile:</p>
      
      <div class="job-card">
        <div class="job-title">Senior Frontend Developer</div>
        <div class="job-company">TechCorp</div>
        <div class="job-location">📍 London, UK</div>
        <div style="margin-bottom: 16px;">
          <span class="match-score">92% Match</span>
          <span style="color: #888888; font-size: 14px; margin-left: 12px;">💰 £70,000 - £90,000</span>
        </div>
        <p style="color: #888888; font-size: 14px; line-height: 1.5;">
          Join our innovative team building next-generation web applications using React, TypeScript, and modern development practices.
        </p>
      </div>
      
      <div class="job-card">
        <div class="job-title">Full Stack Engineer</div>
        <div class="job-company">StartupXYZ</div>
        <div class="job-location">📍 Berlin, Germany</div>
        <div style="margin-bottom: 16px;">
          <span class="match-score">87% Match</span>
          <span style="color: #888888; font-size: 14px; margin-left: 12px;">💰 €65,000 - €85,000</span>
        </div>
        <p style="color: #888888; font-size: 14px; line-height: 1.5;">
          Looking for a passionate developer to help scale our platform. You'll work with Node.js, React, and AWS.
        </p>
      </div>
      
      <div class="job-card">
        <div class="job-title">React Developer</div>
        <div class="job-company">InnovateLab</div>
        <div class="job-location">📍 Amsterdam, Netherlands</div>
        <div style="margin-bottom: 16px;">
          <span class="match-score">89% Match</span>
          <span style="color: #888888; font-size: 14px; margin-left: 12px;">💰 €60,000 - €75,000</span>
        </div>
        <p style="color: #888888; font-size: 14px; line-height: 1.5;">
          We're seeking a React expert to join our product team and build amazing user experiences.
        </p>
      </div>
      
      <div style="height: 1px; background: #1A1A1A; margin: 24px 0;"></div>
      
      <a href="https://jobping.ai/dashboard" class="cta-button">
        View All Matches & Apply →
      </a>
      
      <div style="text-align: center; margin-top: 24px;">
        <p style="color: #666666; font-size: 12px; margin-bottom: 8px;">
          💡 <strong style="color: #FFFFFF;">Pro Tip:</strong> Your feedback trains the AI to find better matches
        </p>
        <p style="color: #666666; font-size: 12px;">
          Next batch arrives in 48 hours with fresh opportunities
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

async function generatePreviews() {
  console.log('🎨 Generating brand-consistent email previews...\n');

  // Create preview directory
  const previewDir = path.join(process.cwd(), 'email-previews');
  if (!fs.existsSync(previewDir)) {
    fs.mkdirSync(previewDir);
  }

  // Generate Welcome Email
  console.log('📧 Generating Welcome Email...');
  const welcomeEmail = createWelcomeEmail();
  fs.writeFileSync(path.join(previewDir, 'welcome-email-new.html'), welcomeEmail);
  console.log('✅ Welcome email saved to: email-previews/welcome-email-new.html');

  // Generate Job Matches Email
  console.log('📧 Generating Job Matches Email...');
  const jobMatchesEmail = createJobMatchesEmail();
  fs.writeFileSync(path.join(previewDir, 'job-matches-new.html'), jobMatchesEmail);
  console.log('✅ Job matches email saved to: email-previews/job-matches-new.html');

  console.log('\n🎉 Brand-consistent email previews generated!');
  
  console.log('\n🎨 NEW DESIGN FEATURES:');
  console.log('  • ⚫ Black background (#000000) - MATCHES frontend');
  console.log('  • ⚪ White text and accents - CONSISTENT with UI');
  console.log('  • 🔤 Inter font family - SAME as website');
  console.log('  • 📱 Mobile responsive design');
  console.log('  • ✨ Subtle glow effects - futuristic minimalist');
  console.log('  • 🎯 Brand-consistent logo and tagline');
  console.log('  • 📧 Professional yet modern aesthetic');

  console.log('\n🔍 BEFORE vs AFTER:');
  console.log('  ❌ OLD: Blue/white generic design');
  console.log('  ✅ NEW: Black/white brand-aligned design');
  console.log('  ❌ OLD: Arial font (basic)');
  console.log('  ✅ NEW: Inter font (matches frontend)');
  console.log('  ❌ OLD: Basic styling');
  console.log('  ✅ NEW: Sophisticated gradients & shadows');

  console.log('\n📂 Open these files in your browser:');
  console.log(`  file://${path.resolve(previewDir, 'welcome-email-new.html')}`);
  console.log(`  file://${path.resolve(previewDir, 'job-matches-new.html')}`);

  console.log('\n💡 The emails now look like they belong to the same brand as your website!');
}

generatePreviews().catch(error => {
  console.error('❌ Preview generation failed:', error);
  process.exit(1);
});
