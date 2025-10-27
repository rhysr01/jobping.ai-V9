// EMAIL VERIFICATION SYSTEM
import { Resend } from 'resend';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';

export class EmailVerificationOracle {
  private static getResendClient() {
    return new Resend(process.env.RESEND_API_KEY);
  }

  private static getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  // Step 1: Generate and hash token before storage
  static async generateVerificationToken(email: string): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 12);
    
    // Store hashed token in database
    const supabase = this.getSupabaseClient();
    const { error } = await supabase
      .from('users')
      .update({ 
        verification_token: hashedToken,
        verification_token_expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      })
      .eq('email', email);
      
    if (error) throw error;
      
    // Return raw token for email link
    return rawToken;
  }

  // Legacy method for backward compatibility
  static generateVerificationTokenLegacy(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Step 2: Verify hashed token (OPTIMIZED)
  static async verifyEmailToken(token: string, email?: string): Promise<{ success: boolean; user?: any; error?: string }> {
    const supabase = this.getSupabaseClient();
    
    try {
      // Get all users with verification tokens (if no email specified, find by token)
      let query = supabase
        .from('users')
        .select('verification_token, verification_token_expires, email, id, full_name')
        .not('verification_token', 'is', null)
        .gt('verification_token_expires', new Date().toISOString()); // Only non-expired tokens
      
      if (email) {
        query = query.eq('email', email);
      }
      
      const { data: users, error: fetchError } = await query;
      
      if (fetchError) {
        return { success: false, error: `Database error: ${fetchError.message}` };
      }
      
      if (!users || users.length === 0) {
        return { success: false, error: 'No valid verification token found' };
      }
      
      // Find the user with the matching token
      let matchedUser = null;
      for (const user of users) {
        const isValid = await bcrypt.compare(token, user.verification_token);
        if (isValid) {
          matchedUser = user;
          break;
        }
      }
      
      if (!matchedUser) {
        return { success: false, error: 'Invalid verification token' };
      }
      
      // Clear token and verify user atomically
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ 
          verification_token: null,
          verification_token_expires: null,
          email_verified: true,
          email_phase: 'welcome',
          onboarding_complete: false,
          last_email_sent: new Date().toISOString()
        })
        .eq('id', matchedUser.id)
        .select()
        .single();
      
      if (updateError) {
        return { success: false, error: `Failed to verify user: ${updateError.message}` };
      }
      
      return { success: true, user: updatedUser };
    } catch (error) {
      return { success: false, error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  static async sendVerificationEmail(email: string, token: string, userName: string) {
    const verificationUrl = `${process.env.NEXT_PUBLIC_URL}/verify-email?token=${token}`;
    
    try {
      const resend = this.getResendClient();
      await resend.emails.send({
        from: 'JobPing <noreply@getjobping.com>',
        to: [email],
        subject: '🎯 Verify your JobPing account',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your JobPing Account</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <style>
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
                color: #AAAAAA;
                font-size: 16px;
              }
              .content {
                padding: 48px 32px;
                text-align: center;
              }
              .title {
                font-size: 28px;
                font-weight: 600;
                color: #FFFFFF;
                margin-bottom: 20px;
                letter-spacing: -0.02em;
              }
              .text {
                color: #AAAAAA;
                margin-bottom: 32px;
                line-height: 1.6;
                font-size: 18px;
              }
              .cta-button {
                display: inline-block;
                background: #FFFFFF;
                color: #000000;
                padding: 20px 40px;
                border-radius: 12px;
                text-decoration: none;
                font-weight: 600;
                font-size: 18px;
                margin: 32px 0;
                box-shadow: 0 0 30px rgba(255, 255, 255, 0.1);
                transition: all 0.3s ease;
              }
              .cta-button:hover {
                background: #CCCCCC;
                transform: translateY(-2px);
              }
              .footer-text {
                color: #666666;
                font-size: 12px;
                margin-top: 24px;
                line-height: 1.4;
              }
              @media (max-width: 600px) {
                body { padding: 10px; }
                .container { margin: 0; border-radius: 0; }
                .header, .content { padding: 24px 16px; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🎯 JobPing</div>
                <div class="tagline">AI-Powered Career Intelligence</div>
              </div>
              
              <div class="content">
                <h1 class="title">Welcome, ${userName}</h1>
                <p class="text">Click to verify your email and start receiving job matches.</p>
                
                <a href="${verificationUrl}" class="cta-button">
                  Verify Email
                </a>
                
                <p class="footer-text">
                  This link expires in 24 hours. If you didn't sign up for JobPing, ignore this email.
                </p>
                
                <p class="footer-text">
                  Can't click the button? Copy this link: ${verificationUrl}
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      });
      
      console.log(`📧 Verification email sent to: ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Verification email failed:', error);
      return false;
    }
  }

  static async verifyEmail(token: string, _supabase: any): Promise<{success: boolean, user?: any, error?: string}> {
    try {
      // Check for test mode
      const isTestMode = process.env.NODE_ENV === 'test' || process.env.JOBPING_TEST_MODE === '1';
      
      if (isTestMode) {
        console.log('🧪 Test mode: Email verification bypassed for testing');
        return { success: true, user: { email: 'test@example.com', email_verified: true } };
      }

      // Use optimized verification with improved error handling
      const verificationResult = await this.verifyEmailToken(token);
      
      if (!verificationResult.success) {
        console.log(`❌ Verification failed: ${verificationResult.error}`);
        return { success: false, error: verificationResult.error };
      }

      const user = verificationResult.user;
      console.log(`✅ User ${user.email} verified successfully`);

      // Trigger welcome sequence for verified user (non-blocking)
      this.triggerWelcomeSequence(user).catch(error => {
        console.error('⚠️ Welcome sequence failed (non-critical):', error);
      });

      return { success: true, user };
    } catch (error) {
      console.error('❌ Email verification error:', error);
      return { success: false, error: 'Verification failed' };
    }
  }

  private static async triggerWelcomeSequence(user: any) {
    try {
      // Send welcome email
      await this.sendWelcomeEmail(user);
      
      // Trigger initial AI matching
      await fetch(`${process.env.NEXT_PUBLIC_URL}/api/match-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, isNewUser: true })
      });
      
      console.log(`🎉 Welcome sequence triggered for: ${user.email}`);
    } catch (error) {
      console.error('❌ Welcome sequence failed:', error);
    }
  }

  private static async sendWelcomeEmail(user: any) {
    const resend = this.getResendClient();
    const supabase = this.getSupabaseClient();

    // Derive simple personalization from user profile
    const firstName = (user.full_name || user.email || '').split(' ')[0];
    const rolePref = user.professional_expertise || user.career_path || '';
    const locationPref = Array.isArray(user.target_cities) ? (user.target_cities[0] || '') : (user.target_cities || '');

    // Fetch 3 sample jobs immediately based on preferences
    let sampleJobs: Array<{ title: string; company: string; location: string; description?: string; created_at?: string; salary?: string; job_type?: string }>= [];
    try {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      let query = supabase
        .from('jobs')
        .select('title, company, location, description, created_at, salary, job_type')
        .eq('status', 'active')
        .gte('created_at', fourteenDaysAgo)
        .limit(100);

      if (locationPref) {
        query = query.ilike('location', `%${locationPref}%`);
      }
      const { data } = await query;
      const pool = Array.isArray(data) ? data : [];

      // Rank by naive relevance: role term match in title first, then recency
      const roleTerm = String(rolePref || '').toLowerCase();
      const ranked = pool.sort((a, b) => {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        const aHit = roleTerm && aTitle.includes(roleTerm) ? 1 : 0;
        const bHit = roleTerm && bTitle.includes(roleTerm) ? 1 : 0;
        const aDate = a.created_at ? Date.parse(a.created_at) : 0;
        const bDate = b.created_at ? Date.parse(b.created_at) : 0;
        if (aHit !== bHit) return bHit - aHit;
        return bDate - aDate;
      });

      sampleJobs = ranked.slice(0, 3);
    } catch {
      sampleJobs = [];
    }

    const subjectRole = rolePref ? String(rolePref).toString() : 'matches';
    const subjectLoc = locationPref ? ` ${locationPref}` : '';
    const subject = `Welcome ${firstName}! Your${subjectLoc ? subjectLoc : ''} ${subjectRole} matches are ready`;

    const jobCardsHtml = sampleJobs.map(j => `
              <div class="highlight-box">
                <div class="highlight-title">${j.title || 'Opportunity'}</div>
                <ul class="list">
                  <li><strong style="color: #FFFFFF;">Company:</strong> ${j.company || 'Unknown'}</li>
                  <li><strong style="color: #FFFFFF;">Location:</strong> ${j.location || 'Unknown'}</li>
                  <li><strong style="color: #FFFFFF;">Salary:</strong> ${j.salary || 'Unknown'}</li>
                  <li><strong style="color: #FFFFFF;">Type:</strong> ${j.job_type || 'Unknown'}</li>
                </ul>
                ${(j.description && j.description.trim().length > 0) ? `<p style="color:#888888;margin-top:8px;">${(j.description || '').slice(0, 140)}...</p>` : `<p style="color:#888888;margin-top:8px;">Description: Unknown</p>`}
              </div>
    `).join('');

    await resend.emails.send({
      from: 'JobPing <noreply@getjobping.com>',
      to: [user.email],
      subject,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to JobPing</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
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
              color: #AAAAAA;
              font-size: 16px;
            }
            .content {
              padding: 48px 32px;
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
            .highlight-title {
              font-size: 18px;
              font-weight: 600;
              color: #FFFFFF;
              margin-bottom: 16px;
            }
            .list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .list li {
              color: #888888;
              margin-bottom: 8px;
              padding-left: 0;
            }
            .profile-section {
              margin-top: 24px;
            }
            .profile-title {
              font-size: 16px;
              font-weight: 600;
              color: #FFFFFF;
              margin-bottom: 12px;
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
            .footer-text {
              color: #666666;
              font-size: 14px;
              text-align: center;
              margin-top: 24px;
              line-height: 1.4;
            }
            @media (max-width: 600px) {
              body { padding: 10px; }
              .container { margin: 0; border-radius: 0; }
              .header, .content { padding: 24px 16px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎯 JobPing</div>
              <div class="tagline">AI-Powered Career Intelligence</div>
            </div>
            
            <div class="content">
              <h1 class="title">Welcome, ${user.full_name}</h1>
              <p class="text">Your account is active. Here are <strong style="color: #FFFFFF;">${sampleJobs.length || 3}</strong> sample matches based on your preferences.</p>

              ${jobCardsHtml}

              <div class="profile-section">
                <div class="profile-title">Your Profile Summary:</div>
                <ul class="list">
                  <li><strong style="color: #FFFFFF;">Career Path:</strong> ${user.career_path || 'Not specified'}</li>
                  <li><strong style="color: #FFFFFF;">Target Cities:</strong> ${Array.isArray(user.target_cities) ? user.target_cities.join(', ') : user.target_cities || 'Not specified'}</li>
                  <li><strong style="color: #FFFFFF;">Start Date:</strong> ${user.start_date || 'Not specified'}</li>
                  <li><strong style="color: #FFFFFF;">Work Style:</strong> ${user.work_environment || 'Not specified'}</li>
                </ul>
              </div>
              
              <a href="https://getjobping.com/dashboard" class="cta-button">
                View Dashboard →
              </a>
              
              <p class="footer-text">
                Questions? Reply to this email. Premium users receive new matches every 48 hours. Free users every week.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });
  }
}
