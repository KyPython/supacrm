# Polar Webhook Testing Guide

## Webhook Endpoint

**URL:** `https://yourdomain.com/api/polar/webhook`  
**Method:** `POST`  
**Health Check:** `GET /api/polar/webhook` (returns status)

---

## Step 1: Verify Endpoint is Accessible

### Local Testing (Development)

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Test health check:**
   ```bash
   curl http://localhost:3000/api/polar/webhook
   ```
   
   Should return:
   ```json
   {
     "status": "ok",
     "endpoint": "/api/polar/webhook",
     "message": "Polar webhook endpoint is accessible"
   }
   ```

3. **Expose with ngrok:**
   ```bash
   ngrok http 3000
   ```
   
   Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

4. **Update Polar webhook URL:**
   - Go to Polar Dashboard → Settings → Webhooks
   - Set URL to: `https://abc123.ngrok.io/api/polar/webhook`

### Production Testing

1. **Deploy your app** to production
2. **Test health check:**
   ```bash
   curl https://yourdomain.com/api/polar/webhook
   ```
3. **Update Polar webhook URL** to production domain

---

## Step 2: Test Webhook with Polar

### Option A: Use Polar's Webhook Testing Tool

1. Go to Polar Dashboard → Settings → Webhooks
2. Find your webhook endpoint
3. Click "Test" or "Send Test Event"
4. Select event type (e.g., `customer.subscription.created`)
5. Check your application logs for the webhook event

### Option B: Manual Test with cURL

Test with a sample subscription event:

```bash
curl -X POST https://yourdomain.com/api/polar/webhook \
  -H "Content-Type: application/json" \
  -H "polar-signature: test-signature" \
  -d '{
    "type": "customer.subscription.created",
    "id": "test-event-123",
    "data": {
      "id": "sub_test_123",
      "customer_id": "cust_test_123",
      "product_id": "be285021-5b05-4413-9a0c-c1f78bbe9b0d",
      "status": "active",
      "customer": {
        "email": "test@example.com"
      }
    }
  }'
```

**Note:** Signature verification will fail in manual tests unless you disable it or use the correct secret.

---

## Step 3: Test with Real Payment

### Complete Checkout Flow

1. **Use checkout button** in your app (or call `/api/polar/checkout`)
2. **Complete payment** in Polar checkout
3. **Check webhook logs** in your application
4. **Verify database** - subscription should be created/updated

### Verify Webhook Received

Check your logs for:
```
Polar webhook received { event_type: 'customer.subscription.created', event_id: '...' }
Subscription updated successfully { subscription_id: '...', plan_type: 'starter', status: 'active' }
```

---

## Step 4: Monitor Webhook Events

### Check Application Logs

Webhook events are logged via the `logger` system. Check:
- Development: Console output
- Production: Your observability backend (configured in `logger.ts`)

### Check Database

After a webhook event, verify subscription was updated:

```sql
SELECT 
  organization_id,
  plan_type,
  status,
  polar_subscription_id,
  polar_customer_id,
  polar_subscription_status,
  updated_at
FROM subscriptions
ORDER BY updated_at DESC
LIMIT 5;
```

---

## Troubleshooting

### Webhook Not Receiving Events

1. **Check endpoint is accessible:**
   ```bash
   curl https://yourdomain.com/api/polar/webhook
   ```
   Should return `{"status":"ok",...}`

2. **Check Polar webhook settings:**
   - URL is correct: `https://yourdomain.com/api/polar/webhook`
   - Events are enabled (subscription.created, subscription.updated, etc.)
   - Webhook is active/enabled

3. **Check webhook logs in Polar:**
   - Go to Polar Dashboard → Settings → Webhooks
   - Click on your webhook
   - View delivery logs and error messages

4. **Check application logs:**
   - Look for "Polar webhook received" messages
   - Check for errors in webhook handler

### Signature Verification Failing

If you see "Invalid webhook signature":

1. **Verify webhook secret matches:**
   - Polar Dashboard → Settings → Webhooks → Your webhook → Secret
   - Compare with `POLAR_WEBHOOK_SECRET` in `.env.local`

2. **Temporarily disable verification** (development only):
   - Remove or comment out signature check in `webhook/route.ts`
   - **Never disable in production!**

### Subscription Not Updating

1. **Check product ID mapping:**
   ```sql
   SELECT plan_type, polar_product_id_monthly, polar_product_id_yearly 
   FROM plan_pricing;
   ```
   Verify product IDs match what Polar sends

2. **Check user email matching:**
   - Webhook tries to find user by email from `subscription.customer.email`
   - Verify email matches a user in `user_profiles` table

3. **Check RLS policies:**
   - Verify `subscriptions` table allows updates
   - Check policies allow webhook service to update

4. **Check logs:**
   - Look for "Could not find organization for subscription" warnings
   - Check for database update errors

---

## Webhook Event Types Handled

The webhook handles these Polar events:

- ✅ `customer.subscription.created` - New subscription
- ✅ `customer.subscription.updated` - Subscription changed
- ✅ `customer.subscription.canceled` - Subscription canceled
- ✅ `payment.succeeded` - Payment completed
- ✅ `payment.failed` - Payment failed

---

## Testing Checklist

- [ ] Health check endpoint returns 200 OK
- [ ] Webhook URL is accessible from internet (not localhost)
- [ ] Polar webhook is configured with correct URL
- [ ] Webhook secret is set in environment variables
- [ ] Test event from Polar dashboard is received
- [ ] Real checkout creates subscription in database
- [ ] Subscription cancellation downgrades to free tier
- [ ] Payment events are logged correctly

---

## Quick Test Commands

### Test Health Check
```bash
curl https://yourdomain.com/api/polar/webhook
```

### Test Webhook (Development - signature disabled)
```bash
curl -X POST http://localhost:3000/api/polar/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"customer.subscription.created","id":"test","data":{"id":"sub_123","customer_id":"cust_123","product_id":"be285021-5b05-4413-9a0c-c1f78bbe9b0d","status":"active","customer":{"email":"test@example.com"}}}'
```

### Check Recent Subscriptions
```sql
SELECT * FROM subscriptions 
ORDER BY updated_at DESC 
LIMIT 5;
```

---

**Status:** Webhook endpoint is ready at `/api/polar/webhook`. Test with Polar's webhook testing tool or complete a real checkout.
