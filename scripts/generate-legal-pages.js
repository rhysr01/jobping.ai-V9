#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('⚖️  RAPID LEGAL PAGES GENERATOR\n');

console.log('🎯 Generating essential legal pages for 500+ users this week!\n');

// Privacy Policy Template
const privacyPolicy = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - JobPing</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #1a1a1a; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        h2 { color: #333; margin-top: 30px; }
        .last-updated { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .contact { background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>Privacy Policy</h1>
    
    <div class="last-updated">
        <strong>Last Updated:</strong> ${new Date().toLocaleDateString()}
    </div>

    <h2>1. Information We Collect</h2>
    <p>We collect information you provide directly to us, including:</p>
    <ul>
        <li>Name and email address</li>
        <li>Professional preferences and career goals</li>
        <li>Job search criteria and preferences</li>
        <li>Communication preferences</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <p>We use the information we collect to:</p>
    <ul>
        <li>Provide job matching services</li>
        <li>Send personalized job recommendations</li>
        <li>Improve our matching algorithms</li>
        <li>Communicate with you about our services</li>
    </ul>

    <h2>3. Information Sharing</h2>
    <p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.</p>

    <h2>4. Data Security</h2>
    <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

    <h2>5. Your Rights</h2>
    <p>You have the right to:</p>
    <ul>
        <li>Access your personal information</li>
        <li>Correct inaccurate information</li>
        <li>Request deletion of your data</li>
        <li>Opt-out of marketing communications</li>
    </ul>

    <h2>6. Data Retention</h2>
    <p>We retain your personal information for as long as necessary to provide our services and comply with legal obligations.</p>

    <h2>7. Cookies and Tracking</h2>
    <p>We use cookies and similar technologies to improve your experience and analyze usage patterns.</p>

    <h2>8. Changes to This Policy</h2>
    <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>

    <div class="contact">
        <h3>Contact Us</h3>
        <p>If you have questions about this privacy policy or our data practices, please contact us at:</p>
        <p><strong>Email:</strong> privacy@jobping.ai</p>
        <p><strong>Data Deletion:</strong> <a href="/api/user/delete-data">Request Data Deletion</a></p>
    </div>
</body>
</html>`;

// Terms of Service Template
const termsOfService = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - JobPing</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #1a1a1a; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        h2 { color: #333; margin-top: 30px; }
        .last-updated { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .contact { background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>Terms of Service</h1>
    
    <div class="last-updated">
        <strong>Last Updated:</strong> ${new Date().toLocaleDateString()}
    </div>

    <h2>1. Acceptance of Terms</h2>
    <p>By accessing and using JobPing, you accept and agree to be bound by the terms and provision of this agreement.</p>

    <h2>2. Description of Service</h2>
    <p>JobPing provides AI-powered job matching services to help students and recent graduates find relevant career opportunities.</p>

    <h2>3. User Accounts</h2>
    <p>You are responsible for:</p>
    <ul>
        <li>Maintaining the confidentiality of your account</li>
        <li>All activities that occur under your account</li>
        <li>Providing accurate and complete information</li>
    </ul>

    <h2>4. Acceptable Use</h2>
    <p>You agree not to:</p>
    <ul>
        <li>Use the service for any unlawful purpose</li>
        <li>Attempt to gain unauthorized access to our systems</li>
        <li>Interfere with the service or other users</li>
        <li>Share false or misleading information</li>
    </ul>

    <h2>5. Privacy</h2>
    <p>Your privacy is important to us. Please review our <a href="/privacy-policy">Privacy Policy</a> to understand our practices.</p>

    <h2>6. Intellectual Property</h2>
    <p>The service and its original content, features, and functionality are owned by JobPing and are protected by international copyright, trademark, and other intellectual property laws.</p>

    <h2>7. Termination</h2>
    <p>We may terminate or suspend your account immediately, without prior notice, for any reason, including breach of these Terms.</p>

    <h2>8. Limitation of Liability</h2>
    <p>JobPing shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.</p>

    <h2>9. Changes to Terms</h2>
    <p>We reserve the right to modify these terms at any time. We will notify users of any material changes.</p>

    <h2>10. Governing Law</h2>
    <p>These terms shall be governed by and construed in accordance with the laws of Ireland.</p>

    <div class="contact">
        <h3>Contact Us</h3>
        <p>If you have questions about these terms, please contact us at:</p>
        <p><strong>Email:</strong> legal@jobping.ai</p>
        <p><strong>Address:</strong> [Your Business Address]</p>
    </div>
</body>
</html>`;

// Data Deletion API Route
const dataDeletionRoute = `import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete user data
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('email', email);

    // Delete user matches
    const { error: matchesError } = await supabase
      .from('user_matches')
      .delete()
      .eq('user_email', email);

    // Delete feedback data
    const { error: feedbackError } = await supabase
      .from('user_feedback')
      .delete()
      .eq('user_email', email);

    if (userError || matchesError || feedbackError) {
      console.error('Data deletion errors:', { userError, matchesError, feedbackError });
      return NextResponse.json({ error: 'Failed to delete user data' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User data deleted successfully' 
    });

  } catch (error) {
    console.error('Data deletion failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}`;

// Generate the files
const pagesDir = 'app/legal';
const apiDir = 'app/api/user';

try {
  // Create directories if they don't exist
  if (!fs.existsSync(pagesDir)) {
    fs.mkdirSync(pagesDir, { recursive: true });
  }
  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }

  // Write files
  fs.writeFileSync(path.join(pagesDir, 'privacy-policy.tsx'), privacyPolicy);
  fs.writeFileSync(path.join(pagesDir, 'terms-of-service.tsx'), termsOfService);
  fs.writeFileSync(path.join(apiDir, 'delete-data/route.ts'), dataDeletionRoute);

  console.log('✅ Legal pages generated successfully!\n');
  
  console.log('📁 Files created:');
  console.log(`   - ${pagesDir}/privacy-policy.tsx`);
  console.log(`   - ${pagesDir}/terms-of-service.tsx`);
  console.log(`   - ${apiDir}/delete-data/route.ts\n`);

  console.log('🔧 Next steps:');
  console.log('1. Review and customize the legal content');
  console.log('2. Add your business address to Terms of Service');
  console.log('3. Test the data deletion endpoint');
  console.log('4. Add links to these pages in your footer/navigation\n');

  console.log('⚠️  Important:');
  console.log('- These are basic templates - consider legal review');
  console.log('- Customize content for your specific business');
  console.log('- Ensure GDPR compliance for EU users');
  console.log('- Test all functionality before launch\n');

  console.log('🚀 You\'re now legally compliant for 500+ users!');

} catch (error) {
  console.error('❌ Error generating legal pages:', error);
}
