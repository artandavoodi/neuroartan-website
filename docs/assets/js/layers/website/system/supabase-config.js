/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) SUPABASE CDN LOADER
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

const SUPABASE_CDN_URL = 'https://esm.sh/@supabase/supabase-js@2?bundle';

/* =============================================================================
   02) SUPABASE CDN LOADER
============================================================================= */
async function loadSupabaseClientLibrary() {
  if (window.__neuroartanSupabaseLibraryPromise) {
    return window.__neuroartanSupabaseLibraryPromise;
  }

  window.__neuroartanSupabaseLibraryPromise = import(SUPABASE_CDN_URL);
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

function waitForSupabaseConfigReady() {
  if (hasResolvedSupabaseConfig()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const handleConfigReady = () => {
      window.removeEventListener('neuroartan:config-ready', handleConfigReady);
      resolve();
    };

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
  const createClient = module.createClient;

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