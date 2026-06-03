import express from 'express';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

const billingRouter = express.Router();

// Parse JSON for API endpoints
billingRouter.use(express.json());

// Create a checkout session for a subscription
billingRouter.post('/create-checkout-session', async (req, res) => {
  const { price_id, success_url, cancel_url, customer_id } = req.body;
  if (!price_id || !success_url || !cancel_url) {
    return res.status(400).json({ error: 'price_id, success_url, and cancel_url are required' });
  }
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      customer: customer_id || undefined,
      success_url,
      cancel_url,
    });
    return res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Create a customer portal session
billingRouter.post('/create-portal-session', async (req, res) => {
  const { customer_id, return_url } = req.body;
  if (!customer_id || !return_url) {
    return res.status(400).json({ error: 'customer_id and return_url are required' });
  }
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer_id,
      return_url,
    });
    return res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Stripe webhook
billingRouter.post('/stripe-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  console.log(`Received Stripe webhook event: ${event.type}`);
  // TODO: Add your business logic here
  return res.status(200).json({ received: true });
});

export default billingRouter;
