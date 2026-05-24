import { bindProfileMenuActions } from './profile-actions.js';
import { getHomeSurfaceState, subscribeHomeSurfaceState } from '../../core/home-surface-state.js';

const BILLING_DATA_URLS = {
  plans: '/assets/data/commerce/plans.json',
  subscriptions: '/assets/data/commerce/subscriptions.json',
  invoices: '/assets/data/commerce/invoices.json',
};

const BILLING_STATE = {
  promise: null,
  data: null,
};

function normalizeString(value = '') {
  return String(value || '').trim();
}

async function fetchJson(path, fallback) {
  try {
    const response = await fetch(path, {
      cache: 'no-store',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (_error) {
    return fallback;
  }
}

async function loadBillingState() {
  if (BILLING_STATE.data) {
    return BILLING_STATE.data;
  }

  if (!BILLING_STATE.promise) {
    BILLING_STATE.promise = Promise.all([
      fetchJson(BILLING_DATA_URLS.plans, { plans: [] }),
      fetchJson(BILLING_DATA_URLS.subscriptions, { current_subscription: null, provider: {} }),
      fetchJson(BILLING_DATA_URLS.invoices, { invoices: [] }),
    ]).then(([plans, subscriptions, invoices]) => {
      BILLING_STATE.data = {
        plans,
        subscriptions,
        invoices,
      };
      return BILLING_STATE.data;
    }).finally(() => {
      BILLING_STATE.promise = null;
    });
  }

  return BILLING_STATE.promise;
}

function setText(root, selector, value) {
  const node = root?.querySelector(selector);
  if (!node) return;
  node.textContent = value;
}

function resolveCurrentPlan(snapshot = {}, billingData = {}) {
  const accountPlan = normalizeString(snapshot?.account?.profile?.subscription_plan).toLowerCase();
  const subscriptionPlan = normalizeString(billingData?.subscriptions?.current_subscription?.plan_id).toLowerCase();
  const planId = accountPlan || subscriptionPlan || 'free';
  const plans = Array.isArray(billingData?.plans?.plans) ? billingData.plans.plans : [];
  return plans.find((plan) => normalizeString(plan?.id).toLowerCase() === planId)
    || plans.find((plan) => normalizeString(plan?.id).toLowerCase() === 'free')
    || { label: 'Free', status_label: 'Active', summary: 'Account access without a paid plan.' };
}

function renderSubscription(root, snapshot = {}, billingData = BILLING_STATE.data || {}) {
  const plan = resolveCurrentPlan(snapshot, billingData);
  const provider = billingData?.subscriptions?.provider || {};
  const invoices = Array.isArray(billingData?.invoices?.invoices)
    ? billingData.invoices.invoices
    : [];
  const connected = provider.connected === true;

  setText(root, '[data-profile-plan-caption]', normalizeString(plan?.summary) || normalizeString(plan?.label) || 'Free');
  setText(root, '[data-profile-plan-status]', normalizeString(plan?.status_label) || 'Active');
  setText(root, '[data-profile-billing-provider-caption]', connected ? 'Stripe customer portal ready' : 'Stripe customer portal pending');
  setText(root, '[data-profile-billing-provider-status]', connected ? 'Ready' : 'Setup required');
  setText(root, '[data-profile-invoice-caption]', invoices.length ? 'Invoice history available' : 'No invoices yet');
  setText(root, '[data-profile-invoice-status]', String(invoices.length));
}

export function mountHomePlatformDestination(root) {
  if (!(root instanceof Element)) {
    return;
  }

  bindProfileMenuActions(root);
  const unsubscribe = subscribeHomeSurfaceState((snapshot) => {
    renderSubscription(root, snapshot);
  });

  void loadBillingState().then((billingData) => {
    renderSubscription(root, getHomeSurfaceState(), billingData);
  });

  return unsubscribe;
}

export function updateHomePlatformDestination(root, options = {}) {
  if (!(root instanceof Element)) {
    return;
  }

  renderSubscription(root, options.snapshot || {}, BILLING_STATE.data || {});
}
