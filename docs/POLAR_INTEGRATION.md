# Polar Payment Integration Guide

**Status:** 🚧 Implementation Guide  
**Payment Provider:** Polar.sh  
**Last Updated:** December 2025

## Overview

This guide walks you through integrating Polar.sh for SaaS subscription payments in SupaCRM. Polar handles:
- Subscription management
- Payment processing
- Webhook events
- Tax compliance
- Customer portal

---

## Step 1: Set Up Polar Account

### 1.1 Create Polar Account

1. Go to [polar.sh](https://polar.sh)
2. Sign up for an account
3. Create your organization
4. Complete setup wizard

### 1.2 Get API Credentials

1. Go to **Settings** → **API**
2. Generate an **Organization Access Token (OAT)**
3. Copy the token (you'll need this for webhooks)
4. Note your **Organization ID**

### 1.3 Configure Webhook Endpoint

1. Go to **Settings** → **Webhooks**
2. Add webhook endpoint: `https://yourdomain.com/api/polar/webhook`
3. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.canceled`
   - `payment.succeeded`
   - `payment.failed`

---

## Step 2: Create Products in Polar

### 2.1 Create Products for Each Plan

In Polar Dashboard, create products matching your pricing tiers:

**Starter Plan:**
- Product Name: "Starter"
- Type: Subscription
- Price: $19/month
- Billing Period: Monthly
- Copy the **Product ID** (you'll need this)

**Starter Annual:**
- Product Name: "Starter (Annual)"
- Type: Subscription
- Price: $15/month (billed annually)
- Billing Period: Yearly
- Copy the **Product ID**

**Professional Plan:**
- Product Name: "Professional"
- Type: Subscription
- Price: $49/month
- Billing Period: Monthly
- Copy the **Product ID**

**Professional Annual:**
- Product Name: "Professional (Annual)"
- Type: Subscription
- Price: $39/month (billed annually)
- Billing Period: Yearly
- Copy the **Product ID**

**Business Plan:**
- Product Name: "Business"
- Type: Subscription
- Price: $99/month
- Billing Period: Monthly
- Copy the **Product ID**

**Business Annual:**
- Product Name: "Business (Annual)"
- Type: Subscription
- Price: $79/month (billed annually)
- Billing Period: Yearly
- Copy the **Product ID**

### 2.2 Update Database with Polar Product IDs

Run this SQL in Supabase to store Polar product IDs:

```sql
-- Update Starter plan with Polar product IDs
UPDATE plan_pricing
SET 
  polar_product_id_monthly = 'YOUR_STARTER_MONTHLY_PRODUCT_ID',
  polar_product_id_yearly = 'YOUR_STARTER_YEARLY_PRODUCT_ID',
  updated_at = NOW()
WHERE plan_type = 'starter';

-- Update Professional plan with Polar product IDs
UPDATE plan_pricing
SET 
  polar_product_id_monthly = 'YOUR_PROFESSIONAL_MONTHLY_PRODUCT_ID',
  polar_product_id_yearly = 'YOUR_PROFESSIONAL_YEARLY_PRODUCT_ID',
  updated_at = NOW()
WHERE plan_type = 'professional';

-- Update Business plan with Polar product IDs
UPDATE plan_pricing
SET 
  polar_product_id_monthly = 'YOUR_BUSINESS_MONTHLY_PRODUCT_ID',
  polar_product_id_yearly = 'YOUR_BUSINESS_YEARLY_PRODUCT_ID',
  updated_at = NOW()
WHERE plan_type = 'business';
```

**Replace `YOUR_*_PRODUCT_ID` with actual Polar product IDs from Step 2.1**

---

## Step 3: Update Database Schema

### 3.1 Add Polar Product ID Columns

Run this migration to add Polar product ID fields:

```sql
-- Add Polar product ID columns to plan_pricing table
ALTER TABLE plan_pricing
ADD COLUMN IF NOT EXISTS polar_product_id_monthly TEXT,
ADD COLUMN IF NOT EXISTS polar_product_id_yearly TEXT;

-- Add Polar customer ID and subscription ID to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS polar_customer_id TEXT,
ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS polar_subscription_status TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_polar_subscription_id 
ON subscriptions(polar_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_polar_customer_id 
ON subscriptions(polar_customer_id);
```

---

## Step 4: Install Polar SDK

### 4.1 Install Package

```bash
npm install @polar-sh/sdk
```

### 4.2 Add Environment Variables

Add to your `.env.local`:

```env
# Polar API Configuration
POLAR_ACCESS_TOKEN=your_organization_access_token_here
POLAR_ORG_ID=your_organization_id_here
POLAR_WEBHOOK_SECRET=your_webhook_secret_here
NEXT_PUBLIC_POLAR_ORG_ID=your_organization_id_here
```

**Important:** 
- `POLAR_ACCESS_TOKEN` - Server-side only (never expose to client)
- `POLAR_WEBHOOK_SECRET` - For webhook signature verification
- `NEXT_PUBLIC_POLAR_ORG_ID` - Safe to expose (used for checkout links)

---

## Step 5: Create API Routes

### 5.1 Create Checkout Session Endpoint

Create `src/app/api/polar/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { planType, billingPeriod } = await request.json();
    
    // Get user from session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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
      return NextResponse.json({ error: 'Product not configured' }, { status: 400 });
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
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&success=true`,
        metadata: {
          user_id: user.id,
          plan_type: planType,
          billing_period: billingPeriod,
        },
      }),
    });

    if (!polarResponse.ok) {
      const error = await polarResponse.json();
      logger.error('Polar checkout failed', new Error(JSON.stringify(error)), { planType, billingPeriod });
      return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
    }

    const { url } = await polarResponse.json();
    
    return NextResponse.json({ checkout_url: url });
  } catch (error) {
    logger.error('Checkout error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 5.2 Create Webhook Endpoint

Create `src/app/api/polar/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('polar-signature');
    
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.POLAR_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      logger.warn('Invalid webhook signature', { signature });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    logger.debug('Polar webhook received', { event_type: event.type });

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
  const { customer_id, product_id, status } = subscription;
  
  // Find user by Polar customer ID or email
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('polar_subscription_id', subscription.id)
    .single();

  if (!subscriptionData) {
    logger.warn('Subscription not found', { polar_subscription_id: subscription.id });
    return;
  }

  // Get plan type from product ID
  const { data: pricing } = await supabase
    .from('plan_pricing')
    .select('plan_type')
    .or(`polar_product_id_monthly.eq.${product_id},polar_product_id_yearly.eq.${product_id}`)
    .single();

  if (!pricing) {
    logger.warn('Pricing not found for product', { product_id });
    return;
  }

  // Update subscription in database
  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan_type: pricing.plan_type,
      status: status === 'active' ? 'active' : 'cancelled',
      polar_subscription_id: subscription.id,
      polar_customer_id: customer_id,
      polar_subscription_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', subscriptionData.organization_id);

  if (error) {
    logger.error('Failed to update subscription', error as Error, { subscription_id: subscription.id });
  }
}

async function handleSubscriptionCanceled(subscription: any) {
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('polar_subscription_id', subscription.id)
    .single();

  if (!subscriptionData) return;

  // Downgrade to free tier
  await supabase
    .from('subscriptions')
    .update({
      plan_type: 'free',
      status: 'cancelled',
      polar_subscription_status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', subscriptionData.organization_id);
}

async function handlePaymentSucceeded(payment: any) {
  logger.debug('Payment succeeded', { payment_id: payment.id });
  // You can add additional logic here (send confirmation email, etc.)
}

async function handlePaymentFailed(payment: any) {
  logger.warn('Payment failed', { payment_id: payment.id });
  // You can add logic to notify user, retry, etc.
}
```

---

## Step 6: Update Pricing Library

Update `src/lib/pricing.ts` to include Polar product IDs:

```typescript
// Add to PlanPricing interface
export interface PlanPricing {
  // ... existing fields ...
  polar_product_id_monthly: string | null;
  polar_product_id_yearly: string | null;
  // Keep stripe fields for backward compatibility if needed
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
}
```

---

## Step 7: Create Checkout Component

Create `src/components/CheckoutButton.tsx`:

```typescript
"use client";

import { useState } from 'react';
import Button from './Button';
import { useAuth } from '@/context/AuthContext';
import { logger } from '@/lib/logger';

interface CheckoutButtonProps {
  planType: 'starter' | 'professional' | 'business';
  billingPeriod: 'monthly' | 'yearly';
  className?: string;
}

export default function CheckoutButton({ 
  planType, 
  billingPeriod,
  className = '' 
}: CheckoutButtonProps) {
  const { user } = useAuth() ?? {};
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!user) {
      alert('Please log in to subscribe');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/polar/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType, billingPeriod }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      // Redirect to Polar checkout
      window.location.href = data.checkout_url;
    } catch (error) {
      logger.error('Checkout failed', error as Error, { planType, billingPeriod });
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading || !user}
      className={className}
      variant="primary"
    >
      {loading ? 'Loading...' : `Subscribe to ${planType}`}
    </Button>
  );
}
```

---

## Step 8: Create Billing Settings Page

Update `src/app/settings/page.tsx` to include billing section:

```typescript
// Add billing tab with:
// - Current subscription status
// - Upgrade/downgrade buttons
// - Payment method management (via Polar customer portal)
// - Invoice history
```

---

## Step 9: Test Integration

### 9.1 Test Checkout Flow

1. Use Polar sandbox mode for testing
2. Create test products in Polar sandbox
3. Test checkout flow end-to-end
4. Verify webhook receives events
5. Verify subscription updates in database

### 9.2 Test Webhooks Locally

Use a tool like [ngrok](https://ngrok.com) to expose local webhook endpoint:

```bash
ngrok http 3000
# Use the ngrok URL in Polar webhook settings
```

---

## Step 10: Go Live

1. Switch Polar to production mode
2. Update environment variables with production credentials
3. Update webhook URL to production domain
4. Test with real payment method (use small amount first)
5. Monitor webhook logs for any issues

---

## Troubleshooting

### Webhook Not Receiving Events

- Check webhook URL is accessible (not localhost)
- Verify webhook secret matches
- Check Polar dashboard for webhook delivery logs
- Verify signature verification logic

### Subscription Not Updating

- Check webhook handler logs
- Verify product IDs match between Polar and database
- Check RLS policies allow updates
- Verify user_id mapping is correct

### Checkout Fails

- Verify Polar API token is correct
- Check product IDs exist in Polar
- Verify user is authenticated
- Check network/CORS issues

---

## Next Steps

After integration:
1. ✅ Test all checkout flows
2. ✅ Monitor webhook events
3. ✅ Set up error alerts
4. ✅ Create customer support docs
5. ✅ Add analytics tracking for conversions

---

## Resources

- [Polar Documentation](https://docs.polar.sh)
- [Polar API Reference](https://docs.polar.sh/api)
- [Polar Webhooks Guide](https://docs.polar.sh/webhooks)
