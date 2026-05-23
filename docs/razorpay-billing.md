# Razorpay Billing

ChessAlive Premium uses Razorpay Subscriptions through the realtime server. The browser never receives `RAZORPAY_KEY_SECRET`; it only receives the public `key_id` and a short-lived `subscription_id`.

## Required Dashboard Setup

1. In Razorpay Dashboard, create a monthly subscription plan for ChessAlive Premium.
2. Set the amount to `INR 100/month`, or update `RAZORPAY_PREMIUM_AMOUNT_PAISE` if pricing changes.
3. Enable international payments in Razorpay if worldwide cards should be accepted. This depends on Razorpay account activation, KYC, settlement, and business approval.
4. Create API keys and a webhook secret.

## Server Environment

```env
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=...
RAZORPAY_PREMIUM_PLAN_ID=plan_xxx
RAZORPAY_PREMIUM_AMOUNT_PAISE=10000
RAZORPAY_PREMIUM_CURRENCY=INR
RAZORPAY_PREMIUM_TOTAL_COUNT=120
RAZORPAY_WEBHOOK_SECRET=...
```

Do not put `RAZORPAY_KEY_SECRET` in client-side env variables. Do not commit real keys.

## Webhook

Configure this endpoint in Razorpay:

```text
https://chessalive.com/api/billing/razorpay/webhook
```

The endpoint verifies `x-razorpay-signature` using `RAZORPAY_WEBHOOK_SECRET` and records a compact billing event in the local event log.

## Runtime Flow

1. The Premium button calls `/api/billing/razorpay/subscription`.
2. The server creates a Razorpay subscription using `RAZORPAY_KEY_SECRET`.
3. The browser opens Razorpay Checkout with `subscription_id`.
4. The Checkout handler posts the payment response to `/api/billing/razorpay/verify`.
5. The server verifies the payment signature and returns `premiumActive: true`.

