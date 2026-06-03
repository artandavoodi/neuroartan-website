const PRICE_ID = window.__SUBSCRIPTION_PRICE_ID__ || '';
const CUSTOMER_ID = window.__STRIPE_CUSTOMER_ID__ || '';

async function handleManagePlan() {
  if (!PRICE_ID) {
    console.error('Price ID is not defined.');
    return;
  }
  try {
    const response = await fetch('/api/billing/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_id: PRICE_ID,
        success_url: window.location.href,
        cancel_url: window.location.href,
        customer_id: CUSTOMER_ID || undefined,
      }),
    });
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      console.error('Failed to create checkout session', data);
    }
  } catch (error) {
    console.error('Error calling checkout session endpoint', error);
  }
}

async function handleBillingPortal() {
  if (!CUSTOMER_ID) {
    console.error('Customer ID is not defined.');
    return;
  }
  try {
    const response = await fetch('/api/billing/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: CUSTOMER_ID,
        return_url: window.location.href,
      }),
    });
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      console.error('Failed to create portal session', data);
    }
  } catch (error) {
    console.error('Error calling portal session endpoint', error);
  }
}

document.addEventListener('click', (event) => {
  const button = event.target instanceof Element ? event.target.closest('[data-profile-action]') : null;
  if (!button) return;
  const action = button.getAttribute('data-profile-action') || '';
  switch (action) {
    case 'manage-plan':
      event.preventDefault();
      handleManagePlan();
      break;
    case 'billing':
    case 'invoices':
      event.preventDefault();
      handleBillingPortal();
      break;
    default:
      break;
  }
});
