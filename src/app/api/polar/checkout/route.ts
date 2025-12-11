import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { planType, billingPeriod } = await request.json();
    
    if (!planType || !billingPeriod) {
      return NextResponse.json({ error: 'planType and billingPeriod are required' }, { status: 400 });
    }

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.warn('Unauthorized checkout attempt', { error: authError });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pricing from database
    const { data: pricing, error: pricingError } = await supabase
      .from('plan_pricing')
      .select('*')
      .eq('plan_type', planType)
      .eq('is_active', true)
      .single();

    if (pricingError || !pricing) {
      logger.error('Failed to get pricing', pricingError as Error, { planType });
      return NextResponse.json({ error: 'Pricing not found' }, { status: 404 });
    }

    // Get Polar product ID based on billing period
    const productId = billingPeriod === 'yearly' 
      ? pricing.polar_product_id_yearly 
      : pricing.polar_product_id_monthly;

    if (!productId) {
      logger.warn('Polar product ID not configured', { planType, billingPeriod });
      return NextResponse.json({ 
        error: 'Product not configured. Please contact support.' 
      }, { status: 400 });
    }

    // Verify Polar credentials are configured
    if (!process.env.POLAR_ACCESS_TOKEN) {
      logger.error('Polar access token not configured');
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 });
    }

    // Create checkout link via Polar API
    const polarResponse = await fetch('https://api.polar.sh/v1/checkout-links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: productId,
        customer_email: user.email,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?tab=billing&success=true`,
        metadata: {
          user_id: user.id,
          plan_type: planType,
          billing_period: billingPeriod,
        },
      }),
    });

    if (!polarResponse.ok) {
      const error = await polarResponse.json().catch(() => ({ error: 'Unknown error' }));
      logger.error('Polar checkout failed', new Error(JSON.stringify(error)), { 
        planType, 
        billingPeriod,
        status: polarResponse.status 
      });
      return NextResponse.json({ 
        error: 'Failed to create checkout. Please try again.' 
      }, { status: 500 });
    }

    const checkoutData = await polarResponse.json();
    
    logger.debug('Checkout link created', { 
      planType, 
      billingPeriod, 
      checkout_id: checkoutData.id 
    });
    
    return NextResponse.json({ checkout_url: checkoutData.url });
  } catch (error) {
    logger.error('Checkout error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
