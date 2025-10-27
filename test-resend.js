const { Resend } = require('resend');
require('dotenv').config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

console.log('API Key exists:', !!process.env.RESEND_API_KEY);
console.log('API Key length:', process.env.RESEND_API_KEY?.length);
console.log('API Key starts with:', process.env.RESEND_API_KEY?.substring(0, 10));

async function testResend() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'JobPing <noreply@onboarding.resend.dev>',
      to: ['delivered@resend.dev'],
      subject: 'Test Email',
      html: '<h1>Test</h1>',
    });

    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Success:', data);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

testResend();
