import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
  try {
    const { email, promoCode } = await req.json();

    if (!email || !promoCode) {
      return NextResponse.json(
        { error: 'Email and promo code required' },
        { status: 400 }
      );
    }

    // Verify promo code is "rhys"
    if (promoCode.toLowerCase() !== 'rhys') {
      return NextResponse.json(
        { error: 'Invalid promo code' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, subscription_active')
      .eq('email', email)
      .single();

    if (existingUser) {
      // EXISTING USER: Upgrade to premium instantly
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);

      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json(
          { error: 'Failed to upgrade user' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true,
        existingUser: true,
        message: '🎉 Upgraded to premium! You\'re all set.',
        redirectUrl: null // No redirect needed - user already has profile
      });
    }

    // NEW USER: Store promo in session/temp table, redirect to Tally
    // Store the promo code validation in a temporary table or session
    // so Tally webhook can apply it after profile creation
    const { error: tempError } = await supabase
      .from('promo_pending')
      .upsert({
        email,
        promo_code: 'rhys',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        created_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      });

    if (tempError) {
      console.error('Error storing promo pending:', tempError);
      // Don't fail - just log and continue
    }

    // Return redirect URL to Tally form
    const tallyFormUrl = process.env.TALLY_FORM_URL || 'https://tally.so/r/your-form-id';
    
    return NextResponse.json({ 
      success: true,
      existingUser: false,
      message: '✅ Promo code valid! Please complete your profile to activate premium.',
      redirectUrl: `${tallyFormUrl}?email=${encodeURIComponent(email)}&promo=rhys`
    });

  } catch (error) {
    console.error('Promo code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

