import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

// Health check endpoint (GET) - allows Polar to verify webhook is accessible
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'ok',
    endpoint: '/api/polar/webhook',
    message: 'Polar webhook endpoint is accessible'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('polar-signature');
    
    // Verify webhook signature if secret is configured
    if (process.env.POLAR_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.POLAR_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        logger.warn('Invalid webhook signature', { 
          received: signature?.substring(0, 10),
          expected: expectedSignature.substring(0, 10)
        });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      logger.warn('Polar webhook secret not configured - skipping signature verification');
    }

    const event = JSON.parse(body);
    logger.debug('Polar webhook received', { 
      event_type: event.type,
      event_id: event.id 
    });

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data);
        break;
      
      case 'customer.subscription.canceled':
        await handleSubscriptionCanceled(event.data);
        break;
      
      case 'payment.succeeded':
        await handlePaymentSucceeded(event.data);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(event.data);
        break;
      
      default:
        logger.debug('Unhandled webhook event', { event_type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Webhook error', error as Error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleSubscriptionUpdate(subscription: any) {
  try {
    const { customer_id, product_id, status, id: subscription_id } = subscription;
    
    logger.debug('Processing subscription update', { 
      subscription_id,
      customer_id,
      product_id,
      status 
    });
    
    // Find subscription by Polar subscription ID
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('organization_id')
      .eq('polar_subscription_id', subscription_id)
      .single();

    // Get plan type from product ID
    const { data: pricing, error: pricingError } = await supabase
      .from('plan_pricing')
      .select('plan_type')
      .or(`polar_product_id_monthly.eq.${product_id},polar_product_id_yearly.eq.${product_id}`)
      .single();

    if (pricingError || !pricing) {
      logger.warn('Pricing not found for product', { 
        product_id,
        error: pricingError 
      });
      return;
    }

    // Get user from customer metadata or email
    let organizationId: string | null = null;
    
    if (existingSubscription) {
      organizationId = existingSubscription.organization_id;
    } else if (subscription.customer?.email) {
      // Try to find user by email
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', subscription.customer.email)
        .single();
      
      if (userProfile) {
        organizationId = userProfile.id;
      }
    }

    if (!organizationId) {
      logger.warn('Could not find organization for subscription', { 
        subscription_id,
        customer_id 
      });
      return;
    }

    // Upsert subscription
    const { error: updateError } = await supabase
      .from('subscriptions')
      .upsert({
        organization_id: organizationId,
        plan_type: pricing.plan_type,
        status: status === 'active' ? 'active' : 'cancelled',
        polar_subscription_id: subscription_id,
        polar_customer_id: customer_id,
        polar_subscription_status: status,
        current_period_start: subscription.current_period_start 
          ? new Date(subscription.current_period_start).toISOString() 
          : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id'
      });

    if (updateError) {
      logger.error('Failed to update subscription', updateError as Error, { 
        subscription_id,
        organization_id 
      });
    } else {
      logger.debug('Subscription updated successfully', { 
        subscription_id,
        plan_type: pricing.plan_type,
        status 
      });
    }
  } catch (error) {
    logger.error('Error handling subscription update', error as Error);
  }
}

async function handleSubscriptionCanceled(subscription: any) {
  try {
    const { id: subscription_id } = subscription;
    
    const { data: subscriptionData } = await supabase
      .from('subscriptions')
      .select('organization_id')
      .eq('polar_subscription_id', subscription_id)
      .single();

    if (!subscriptionData) {
      logger.warn('Subscription not found for cancellation', { subscription_id });
      return;
    }

    // Downgrade to free tier
    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan_type: 'free',
        status: 'cancelled',
        polar_subscription_status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', subscriptionData.organization_id);

    if (error) {
      logger.error('Failed to cancel subscription', error as Error, { subscription_id });
    } else {
      logger.debug('Subscription canceled', { subscription_id });
    }
  } catch (error) {
    logger.error('Error handling subscription cancellation', error as Error);
  }
}

async function handlePaymentSucceeded(payment: any) {
  logger.debug('Payment succeeded', { 
    payment_id: payment.id,
    amount: payment.amount,
    currency: payment.currency 
  });
  // You can add additional logic here (send confirmation email, update metrics, etc.)
}

async function handlePaymentFailed(payment: any) {
  logger.warn('Payment failed', { 
    payment_id: payment.id,
    amount: payment.amount,
    currency: payment.currency 
  });
  // You can add logic to notify user, retry payment, etc.
}
