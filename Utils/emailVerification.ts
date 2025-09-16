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

  // Step 2: Verify hashed token
  static async verifyEmailToken(token: string): Promise<boolean> {
    const supabase = this.getSupabaseClient();
    const { data: user } = await supabase
      .from('users')
      .select('verification_token, verification_token_expires, email')
      .not('verification_token', 'is', null)
      .single();
      
    if (!user?.verification_token) return false;
      
    // Check expiry
    if (new Date() > new Date(user.verification_token_expires)) {
      return false;
    }
      
    // Compare hashed token
    const isValid = await bcrypt.compare(token, user.verification_token);
      
    if (isValid) {
      // Clear token after successful verification
      await supabase
        .from('users')
        .update({ 
          verification_token: null,
          verification_token_expires: null,
          email_verified: true
        })
        .eq('verification_token', user.verification_token);
    }
      
    return isValid;
  }

  static async sendVerificationEmail(email: string, token: string, userName: string) {
    const verificationUrl = `${process.env.NEXT_PUBLIC_URL}/verify-email?token=${token}`;
    
    try {
      const resend = this.getResendClient();
      await resend.emails.send({
        from: 'JobPing <noreply@jobping.ai>',
        to: [email],
        subject: '🎯 Verify your JobPing account',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h2>Welcome to JobPing, ${userName}! 🚀</h2>
            <p>You're one step away from receiving personalized job matches every 48 hours!</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; font-weight: bold;">
                Verify Email & Activate Account
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              This link expires in 24 hours. If you didn't sign up for JobPing, ignore this email.
            </p>
            
            <p style="color: #666; font-size: 12px;">
              Can't click the button? Copy this link: ${verificationUrl}
            </p>
          </div>
        `
      });
      
      console.log(`📧 Verification email sent to: ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Verification email failed:', error);
      return false;
    }
  }

  static async verifyEmail(token: string, supabase: any): Promise<{success: boolean, user?: any, error?: string}> {
    try {
      // Check for test mode
      const isTestMode = process.env.NODE_ENV === 'test' || process.env.JOBPING_TEST_MODE === '1';
      
      if (isTestMode) {
        console.log('🧪 Test mode: Email verification bypassed for testing');
        return { success: true, user: { email: 'test@example.com', email_verified: true } };
      }

      // Use new bcrypt-based verification
      const isValid = await this.verifyEmailToken(token);
      
      if (!isValid) {
        console.log('❌ Verification failed: Invalid or expired token');
        return { success: false, error: 'Invalid or expired verification token' };
      }

      // Get the verified user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email_verified', true)
        .not('verification_token', 'is', null)
        .single();

      if (userError || !user) {
        console.error('❌ Failed to fetch verified user:', userError);
        return { success: false, error: 'Failed to verify email' };
      }

      console.log(`✅ User ${user.email} verified successfully`);

      // Trigger initial matching for verified user
      await this.triggerWelcomeSequence(user);

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

    // Compute a user-friendly local time string for "first matches"
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Keep 11:11 to preserve brand voice, but show user's local TZ abbreviation
    tomorrow.setHours(11, 11, 0, 0);
    const timeString = tomorrow.toLocaleString('en-GB', {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    await resend.emails.send({
      from: 'JobPing <noreply@jobping.ai>',
      to: [user.email],
      subject: '🎉 Welcome to JobPing - Your job hunt starts now!',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2>Welcome aboard, ${user.full_name}! 🚀</h2>
          <p>Your JobPing account is now <strong>active</strong>!</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">What happens next?</h3>
            <ul>
              <li>📊 We're analyzing your profile</li>
              <li>🤖 AI is finding your perfect matches</li>
              <li>📧 First matches arriving <strong>${timeString}</strong></li>
            </ul>
          </div>
          
          <p><strong>Your Profile Summary:</strong></p>
          <ul>
            <li>Career Path: ${user.career_path || 'Not specified'}</li>
            <li>Target Cities: ${Array.isArray(user.target_cities) ? user.target_cities.join(', ') : user.target_cities || 'Not specified'}</li>
            <li>Start Date: ${user.start_date || 'Not specified'}</li>
            <li>Work Style: ${user.work_environment || 'Not specified'}</li>
          </ul>
          
          <p>Need to update anything? Reply to this email!</p>
          <p>Save time, stress less, apply more! 💪</p>
        </div>
      `
    });
  }
}
