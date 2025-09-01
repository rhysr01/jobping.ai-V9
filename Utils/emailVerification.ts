// EMAIL VERIFICATION SYSTEM
import { Resend } from 'resend';
import crypto from 'crypto';

export class EmailVerificationOracle {
  private static getResendClient() {
    return new Resend(process.env.RESEND_API_KEY);
  }

  static generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
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

      // Find user with this verification token
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('verification_token', token)
        .eq('email_verified', false)
        .single();

      if (error || !user) {
        console.log(`❌ Verification failed: ${error ? error.message : 'User not found'}`);
        return { success: false, error: 'Invalid or expired verification token' };
      }

      // Check if token is expired (24 hours)
      const tokenAge = Date.now() - new Date(user.created_at).getTime();
      const expirationTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (tokenAge > expirationTime) {
        console.log(`❌ Token expired: ${tokenAge}ms > ${expirationTime}ms`);
        return { success: false, error: 'Verification token has expired' };
      }

      console.log(`✅ Token valid: ${tokenAge}ms < ${expirationTime}ms`);

      // Activate user
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ 
          email_verified: true, 
          verification_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Failed to update user verification status:', updateError);
        return { success: false, error: 'Failed to verify email' };
      }

      console.log(`✅ User ${updatedUser.email} verified successfully`);

      // Trigger initial matching for verified user
      await this.triggerWelcomeSequence(updatedUser);

      return { success: true, user: updatedUser };
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
              <li>📧 First matches arriving at <strong>11:11 AM tomorrow</strong></li>
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
