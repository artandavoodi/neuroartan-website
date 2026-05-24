/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) SUPABASE CLIENT LOADER
   03) CONFIGURATION RESOLUTION
   04) CONFIG READINESS GUARD
   05) GLOBAL REGISTRATION
   06) READINESS EVENT
   07) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/*
 * Sovereign backend configuration entry for the Supabase-first transitional
 * backend architecture. This file must remain dedicated to Supabase ownership
 * and must not inherit Firebase naming, state, or runtime responsibility.
 */

const SUPABASE_LOCAL_UMD_URL = '/assets/vendor/supabase/supabase-js.umd.js';
const SUPABASE_CDN_URL = 'https://esm.sh/@supabase/supabase-js@2?bundle';

/* =============================================================================
   02) SUPABASE CLIENT LOADER
============================================================================= */
function getWebsiteBasePath() {
  const pathname = window.location.pathname || '';

  if (pathname.includes('/website/docs/')) return '/website/docs';
  if (pathname.endsWith('/website/docs')) return '/website/docs';
  if (pathname.includes('/docs/')) return '/docs';
  if (pathname.endsWith('/docs')) return '/docs';

  return '';
}

function assetPath(path) {
  const normalized = String(path || '').trim();
  if (!normalized) return '';

  const base = getWebsiteBasePath();
  return `${base}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-neuroartan-supabase-client="${src}"]`);
    if (existing) {
      if (existing.dataset.neuroartanLoaded === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Unable to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.neuroartanSupabaseClient = src;
    script.addEventListener('load', () => {
      script.dataset.neuroartanLoaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => {
      reject(new Error(`Unable to load ${src}`));
    }, { once: true });
    document.head.appendChild(script);
  });
}

async function loadSupabaseClientLibrary() {
  if (window.__neuroartanSupabaseLibraryPromise) {
    return window.__neuroartanSupabaseLibraryPromise;
  }

  window.__neuroartanSupabaseLibraryPromise = (async () => {
    if (window.supabase?.createClient) {
      return window.supabase;
    }

    try {
      await loadScript(assetPath(SUPABASE_LOCAL_UMD_URL));
      if (window.supabase?.createClient) {
        return window.supabase;
      }
    } catch (error) {
      console.warn('[Neuroartan][Supabase] Local client load failed. Falling back to CDN.', error);
    }

    return import(SUPABASE_CDN_URL);
  })();

  return window.__neuroartanSupabaseLibraryPromise;
}

/* =============================================================================
   03) CONFIGURATION RESOLUTION
============================================================================= */
function resolveSupabaseConfig() {
  const root = window.NEUROARTAN_CONFIG || {};
  const supabase = root.supabase || {};

  return {
    url: supabase.url || '',
    anonKey: supabase.anonKey || ''
  };
}

/* =============================================================================
   04) CONFIG READINESS GUARD
============================================================================= */
function hasResolvedSupabaseConfig() {
  const { url, anonKey } = resolveSupabaseConfig();
  return Boolean(url && anonKey);
}

function waitForSupabaseConfigReady(timeoutMs = 3000) {
  if (hasResolvedSupabaseConfig()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      window.removeEventListener('neuroartan:config-ready', handleConfigReady);
      resolve();
    };

    const handleConfigReady = () => {
      finish();
    };

    timeoutId = window.setTimeout(finish, timeoutMs);
    window.addEventListener('neuroartan:config-ready', handleConfigReady, {
      once: true
    });
  });
}

/* =============================================================================
   05) GLOBAL REGISTRATION
============================================================================= */
async function registerSupabaseClient() {
  await waitForSupabaseConfigReady();
  const { url, anonKey } = resolveSupabaseConfig();

  if (!url || !anonKey) {
    window.neuroartanSupabase = null;
    window.dispatchEvent(
      new CustomEvent('neuroartan:supabase-missing-config', {
        detail: {
          urlConfigured: Boolean(url),
          anonKeyConfigured: Boolean(anonKey)
        }
      })
    );
    return null;
  }

  const module = await loadSupabaseClientLibrary();
  const createClient = module?.createClient || module?.default?.createClient || window.supabase?.createClient;

  if (typeof createClient !== 'function') {
    throw new Error('Supabase client library failed to expose createClient.');
  }

  const client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  window.neuroartanSupabase = client;
  return client;
}

/* =============================================================================
   06) READINESS EVENT
============================================================================= */
registerSupabaseClient()
  .then((client) => {
    window.dispatchEvent(
      new CustomEvent('neuroartan:supabase-ready', {
        detail: {
          configured: Boolean(client)
        }
      })
    );
  })
  .catch((error) => {
    console.error('[Neuroartan][Supabase] Initialization failed.', error);
    window.dispatchEvent(
      new CustomEvent('neuroartan:supabase-error', {
        detail: {
          message: error?.message || 'Unknown Supabase initialization error.'
        }
      })
    );
  });

/* =============================================================================
   07) END OF FILE
============================================================================= */
