# Polar Integration Setup Checklist

Follow these steps in order to integrate Polar.sh for SaaS payments.

## ✅ Step 4: Update Database with Product IDs

**Monthly Product IDs:**
- Starter: `be285021-5b05-4413-9a0c-c1f78bbe9b0d`
- Professional: `8efa45b3-f4c1-48e8-b46d-93431b2f340b`
- Business: `738a97c8-925d-4bca-9c7d-bf06b2b0c922`

**To do:**
- [ ] Run `database/update_polar_product_ids.sql` in Supabase SQL Editor
- [ ] Create yearly products in Polar (if not done yet)
- [ ] Update `polar_product_id_yearly` for each plan
- [ ] Verify: `SELECT plan_type, polar_product_id_monthly, polar_product_id_yearly FROM plan_pricing;`

## ✅ Step 5: Install Dependencies

- [ ] Run: `npm install @polar-sh/sdk` (if using SDK, optional)
- [ ] Verify `.env.local` has all Polar variables:
  - `POLAR_ACCESS_TOKEN`
  - `POLAR_ORG_ID`
  - `POLAR_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_POLAR_ORG_ID`
  - `NEXT_PUBLIC_APP_URL` (your domain)

## ✅ Step 6: Test Checkout Flow

### Local Testing (with ngrok)

- [ ] Install ngrok: `brew install ngrok` (Mac) or download from ngrok.com
- [ ] Start dev server: `npm run dev`
- [ ] Expose webhook: `ngrok http 3000`
- [ ] Copy ngrok URL (e.g., `https://abc123.ngrok.io`)
- [ ] Update Polar webhook URL to: `https://abc123.ngrok.io/api/polar/webhook`
- [ ] Test checkout button in app
- [ ] Verify redirect to Polar checkout
- [ ] Complete test payment (use test card)
- [ ] Check webhook receives event
- [ ] Verify subscription created in database

### Production Testing

- [ ] Deploy to production
- [ ] Update Polar webhook URL to production domain
- [ ] Test checkout with real payment (small amount)
- [ ] Verify webhook events received
- [ ] Verify subscription updates correctly

## ✅ Step 7: Verify Integration

- [ ] Checkout flow works end-to-end
- [ ] Webhook receives events
- [ ] Subscriptions update in database
- [ ] Plan changes reflect immediately
- [ ] Cancellations downgrade to free tier
- [ ] Error handling works (invalid product IDs, etc.)

## ✅ Step 8: Add Billing UI

- [ ] Create billing section in Settings page
- [ ] Show current subscription status
- [ ] Add upgrade/downgrade buttons using `CheckoutButton` component
- [ ] Add link to Polar customer portal for payment methods
- [ ] Display invoice history (if available via Polar API)

## ✅ Step 9: Monitor & Maintain

- [ ] Set up error alerts for webhook failures
- [ ] Monitor checkout conversion rates
- [ ] Track subscription lifecycle events
- [ ] Review webhook logs regularly
- [ ] Update product IDs if prices change in Polar

---

```

### Testing Checklist

- [ ] Checkout creates Polar checkout link
- [ ] Webhook verifies signature correctly
- [ ] Subscription created event updates database
- [ ] Subscription updated event updates database
- [ ] Subscription canceled event downgrades to free
- [ ] Payment succeeded event logged
- [ ] Payment failed event logged
- [ ] Error handling works for missing product IDs
- [ ] Error handling works for invalid tokens

---

## Troubleshooting

### Checkout Fails
- Verify `POLAR_ACCESS_TOKEN` is set correctly
- Check product IDs exist in Polar dashboard
- Verify product IDs match in database
- Check network/CORS issues

### Webhook Not Receiving Events
- Verify webhook URL is accessible (not localhost)
- Check webhook secret matches
- Verify signature verification logic
- Check Polar dashboard for delivery logs

### Subscription Not Updating
- Check webhook handler logs
- Verify product IDs match
- Check RLS policies allow updates
- Verify user_id mapping is correct

---

**Status:** Ready to implement. Follow steps 1-9 in order.
