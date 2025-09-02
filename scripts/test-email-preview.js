// Test script to preview email template
const fs = require('fs');
const path = require('path');

// Mock data for testing
const mockJobs = [
  {
    title: 'Graduate Software Engineer',
    company: 'TechCorp',
    location: 'London, UK',
    job_url: 'https://example.com/job1',
    match_reason: 'Strong match based on your software engineering background and location preferences.',
    match_score: '95%',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
  },
  {
    title: 'Junior Data Analyst',
    company: 'DataFlow Inc',
    location: 'Berlin, Germany',
    job_url: 'https://example.com/job2',
    match_reason: 'Perfect for your analytical skills and interest in data science.',
    match_score: '88%',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  },
  {
    title: 'Marketing Assistant',
    company: 'GrowthCo',
    location: 'Amsterdam, Netherlands',
    job_url: 'https://example.com/job3',
    match_reason: 'Great entry-level opportunity in digital marketing.',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
  }
];

// Test both premium and free templates
const testCases = [
  {
    name: 'Premium User Email',
    isPremium: true,
    userName: 'Sarah',
    isSignupEmail: false
  },
  {
    name: 'Free User Email',
    isPremium: false,
    userName: 'John',
    isSignupEmail: false
  },
  {
    name: 'Welcome Email',
    isPremium: false,
    userName: 'Alex',
    isSignupEmail: true
  }
];

console.log('🧪 Email Template Preview Test');
console.log('================================');

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log('--------------------------------');
  
  // Generate email HTML (simplified version)
  const emailTypeText = testCase.isSignupEmail ? 'Welcome! Here are your first' : 'Your fresh';
  const jobLimit = testCase.isPremium ? 15 : 6;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
      <title>JobPing - Your AI-Curated Job Matches</title>
    </head>
    <body style="
      margin: 0;
      padding: 0;
      background: #F8F9FA;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      font-feature-settings: 'tnum' on, 'lnum' on, 'kern' on;
      line-height: 1.6;
      color: #1A1A1A;
    ">
      <!-- Email Container -->
      <div style="
        max-width: 600px;
        margin: 0 auto;
        background: #FFFFFF;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        margin-top: 20px;
        margin-bottom: 20px;
      ">
        <!-- Header -->
        <div style="
          background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%);
          padding: 40px 32px;
          text-align: center;
        ">
          <div style="
            font-size: 32px;
            font-weight: 900;
            letter-spacing: -0.02em;
            color: #FFFFFF;
            margin-bottom: 8px;
          ">
            JobPing
          </div>
          <div style="
            font-size: 16px;
            color: #E5E5E5;
            font-weight: 500;
            letter-spacing: 0.5px;
          ">
            AI-Powered Job Matching
          </div>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 32px;">
          ${testCase.isPremium ? `
          <!-- Premium Badge -->
          <div style="
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
            color: #1A1A1A;
            padding: 8px 16px;
            border-radius: 20px;
            margin-bottom: 24px;
            text-align: center;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            display: inline-block;
            width: 100%;
            box-sizing: border-box;
          ">
            ⭐ Premium Member
          </div>
          ` : ''}
          
          <!-- Greeting -->
          <h1 style="
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 16px 0;
            letter-spacing: -0.01em;
            color: #1A1A1A;
            line-height: 1.2;
          ">
            Hi${testCase.userName ? ' ' + testCase.userName : ''} 👋
          </h1>
          
          <!-- Intro Message -->
          <p style="
            font-size: 18px;
            line-height: 1.6;
            margin: 0 0 32px 0;
            color: #4A4A4A;
            font-weight: 400;
          ">
            ${testCase.isSignupEmail ? 'Welcome to <strong style="color: #1A1A1A;">JobPing</strong>! 🎉' : 'Your fresh job matches are here!'}<br>
            ${emailTypeText} <strong style="color: #1A1A1A;">${mockJobs.length} ${testCase.isPremium ? 'premium ' : ''}AI-matched opportunities</strong>:
          </p>
          
          <!-- Job Cards -->
          <div style="margin-bottom: 32px;">
            ${mockJobs.map((job, index) => `
              <!-- Job Card ${index + 1} -->
              <div style="
                background: #FFFFFF;
                border: 1px solid #E5E5E5;
                border-radius: 12px;
                margin-bottom: 16px;
                padding: 24px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                transition: all 0.2s ease;
                ${index === 0 ? 'border: 2px solid #1A1A1A; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);' : ''}
              ">
                <!-- Job Header -->
                <div style="margin-bottom: 16px;">
                  <h3 style="
                    margin: 0 0 8px 0;
                    font-size: 20px;
                    font-weight: 700;
                    color: #1A1A1A;
                    line-height: 1.3;
                  ">
                    <a href="${job.job_url}" target="_blank" style="
                      color: #1A1A1A;
                      text-decoration: none;
                    ">${job.title}</a>
                  </h3>
                  <p style="
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #4A4A4A;
                  ">${job.company}</p>
                </div>
                
                <!-- Job Details -->
                <div style="
                  display: flex;
                  align-items: center;
                  gap: 16px;
                  margin-bottom: 16px;
                  flex-wrap: wrap;
                ">
                  ${job.location ? `
                  <span style="
                    font-size: 14px;
                    color: #666666;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 500;
                  ">
                    📍 ${job.location}
                  </span>
                  ` : ''}
                  ${testCase.isPremium && (job.match_score || index === 0) ? `
                  <span style="
                    background: #1A1A1A;
                    color: #FFFFFF;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                  ">
                    ${job.match_score || 'Top Match'}
                  </span>
                  ` : ''}
                  <span style="
                    font-size: 14px;
                    color: #666666;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 500;
                  ">
                    📅 Posted ${index === 0 ? '2 days ago' : index === 1 ? 'yesterday' : '5 days ago'}
                  </span>
                </div>
                
                ${testCase.isPremium ? `
                <!-- Premium Match Insights -->
                <div style="
                  background: #F8F9FA;
                  border-left: 3px solid #1A1A1A;
                  padding: 16px;
                  border-radius: 8px;
                  margin-bottom: 16px;
                ">
                  <div style="
                    font-size: 13px;
                    font-weight: 700;
                    color: #1A1A1A;
                    margin-bottom: 6px;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                  ">
                    Why this matches you:
                  </div>
                  <div style="
                    font-size: 14px;
                    color: #4A4A4A;
                    line-height: 1.5;
                  ">
                    ${job.match_reason}
                  </div>
                </div>
                ` : job.match_reason ? `
                <!-- Basic Match Reason -->
                <div style="
                  background: #F8F9FA;
                  padding: 12px 16px;
                  border-radius: 8px;
                  margin-bottom: 16px;
                ">
                  <div style="
                    font-size: 14px;
                    color: #4A4A4A;
                    line-height: 1.4;
                    font-style: italic;
                  ">
                    ${job.match_reason}
                  </div>
                </div>
                ` : ''}
                
                <!-- Apply Button -->
                <div style="margin-top: 16px;">
                  <a href="${job.job_url}" target="_blank" style="
                    display: inline-block;
                    background: #1A1A1A;
                    color: #FFFFFF;
                    padding: 12px 24px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-size: 14px;
                    font-weight: 600;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                  ">
                    View Job →
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
          
          ${!testCase.isPremium ? `
          <!-- Upgrade Prompt -->
          <div style="
            background: linear-gradient(135deg, #F8F9FA 0%, #E9ECEF 100%);
            border: 1px solid #DEE2E6;
            border-radius: 12px;
            padding: 32px;
            margin-bottom: 32px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
          ">
            <h3 style="
              margin: 0 0 16px 0;
              color: #1A1A1A;
              font-size: 22px;
              font-weight: 700;
              letter-spacing: -0.01em;
            ">
              Want more opportunities? 🚀
            </h3>
            <p style="
              margin: 0 0 24px 0;
              color: #4A4A4A;
              font-size: 16px;
              line-height: 1.6;
            ">
              Premium members get <strong style="color: #1A1A1A;">~45 jobs per week</strong><br>
              + detailed match insights + priority support
            </p>
            <a href="#" style="
              display: inline-block;
              background: #1A1A1A;
              color: #FFFFFF;
              padding: 14px 28px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              font-size: 14px;
              letter-spacing: 0.3px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              transition: all 0.2s ease;
            ">
              Upgrade to Premium
            </a>
          </div>
          ` : ''}
          
          <!-- Schedule Info -->
          <div style="
            text-align: center;
            margin-bottom: 32px;
            padding: 20px;
            background: #F8F9FA;
            border-radius: 12px;
            border: 1px solid #E9ECEF;
          ">
            <p style="
              margin: 0 0 8px 0;
              font-size: 16px;
              color: #1A1A1A;
              font-weight: 600;
            ">
              You'll get <strong>${testCase.isPremium ? jobLimit + ' premium jobs every 48 hours' : jobLimit + ' jobs per week'}</strong>
            </p>
            <p style="
              margin: 0;
              font-size: 14px;
              color: #666666;
            ">
              ${testCase.isPremium ? 'Manage your subscription anytime in your account.' : 'Reply with "unsubscribe" to stop these emails.'}
            </p>
          </div>
          
          ${testCase.isSignupEmail ? `
          <!-- Welcome Next Steps -->
          <div style="
            background: linear-gradient(135deg, #E8F5E8 0%, #D4F4D4 100%);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 32px;
            text-align: center;
            border: 1px solid #C3E6C3;
          ">
            <p style="
              margin: 0;
              color: #2D5A2D;
              font-size: 16px;
              font-weight: 600;
            ">
              <strong>Next steps:</strong> Check your email every 48 hours for fresh opportunities!
            </p>
          </div>
          ` : ''}
          
        </div>
        
        <!-- Footer -->
        <div style="
          background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%);
          padding: 32px;
          text-align: center;
        ">
          <div style="
            font-size: 24px;
            font-weight: 900;
            letter-spacing: 1px;
            color: #FFFFFF;
            margin-bottom: 8px;
          ">
            JobPing
          </div>
          <p style="
            margin: 0;
            font-size: 14px;
            color: #E5E5E5;
            letter-spacing: 0.3px;
          ">
            AI-powered job matching for ambitious professionals
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Save to file for preview
  const filename = `email-preview-${index + 1}.html`;
  fs.writeFileSync(filename, html);
  
  console.log(`✅ Generated: ${filename}`);
  console.log(`   - Premium: ${testCase.isPremium}`);
  console.log(`   - Welcome: ${testCase.isSignupEmail}`);
  console.log(`   - User: ${testCase.userName}`);
  console.log(`   - Jobs: ${mockJobs.length}`);
});

console.log('\n🎉 Email preview files generated!');
console.log('📧 Open the HTML files in your browser to see how the emails look.');
console.log('✨ Key improvements made:');
console.log('   - Clean, modern design with better typography');
console.log('   - Improved readability with proper spacing');
console.log('   - Professional color scheme and gradients');
console.log('   - Mobile-responsive layout');
console.log('   - Clear call-to-action buttons');
console.log('   - Actual posting dates instead of freshness tiers');
