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

function isSharedNeuroartanAuthHost() {
  const hostname = String(window.location.hostname || '').toLowerCase();
  return hostname === 'neuroartan.com'
    || hostname.endsWith('.neuroartan.com')
    || hostname === '127.0.0.1'
    || hostname === 'localhost';
}

function readCookieValue(name) {
  const encodedName = `${encodeURIComponent(name)}=`;
  const match = String(document.cookie || '')
    .split('; ')
    .find((entry) => entry.startsWith(encodedName));
  if (!match) return null;

  try {
    return decodeURIComponent(match.slice(encodedName.length));
  } catch (_) {
    return null;
  }
}

function createNeuroartanAuthStorage() {
  if (!isSharedNeuroartanAuthHost()) return window.localStorage;

  const hostname = String(window.location.hostname || '').toLowerCase();
  const productionDomain = hostname === 'neuroartan.com' || hostname.endsWith('.neuroartan.com');
  const sharedCookieAttributes = productionDomain
    ? ['Path=/', 'Domain=.neuroartan.com', 'SameSite=Lax', 'Secure']
    : ['Path=/', 'SameSite=Lax'];

  const writeCookie = (key, value, maxAge) => {
    document.cookie = [
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
      ...sharedCookieAttributes,
      `Max-Age=${maxAge}`,
    ].join('; ');
  };

  // OAuth sessions can exceed a browser's per-cookie limit. Keep each encoded
  // part bounded while preserving the shared-domain session contract.
  const chunkKeys = key => String(document.cookie || '').split('; ')
    .map(entry => entry.split('=')[0])
    .filter(name => name.startsWith(`${encodeURIComponent(key)}.`))
    .map(name => decodeURIComponent(name))
    .filter(name => /^\d+$/.test(name.slice(key.length + 1)))
    .sort((a,b) => Number(a.slice(key.length+1))-Number(b.slice(key.length+1)));
  const removeCookies = key => {
    writeCookie(key, '', 0);
    chunkKeys(key).forEach(name => writeCookie(name, '', 0));
  };
  const readSession = key => {
    const single=readCookieValue(key);
    if(single!==null)return single;
    const keys=chunkKeys(key);
    if(!keys.length)return null;
    if(keys.some((name,index)=>name!==`${key}.${index}`))return null;
    return keys.map(name=>readCookieValue(name)).join('');
  };
  const writeSession = (key,value) => {
    const chunks=[];
    let chunk='';
    for(const character of String(value)){
      if(encodeURIComponent(chunk+character).length>3000){chunks.push(chunk);chunk='';}
      chunk+=character;
    }
    chunks.push(chunk);
    removeCookies(key);
    chunks.forEach((part,index)=>writeCookie(chunks.length===1?key:`${key}.${index}`,part,31536000));
    if(readSession(key)!==String(value))throw new Error('Your browser could not save the sign-in session.');
  };

  return {
    getItem(key) {
      const cookieValue = readSession(key);
      if (cookieValue !== null) return cookieValue;

      const legacyValue = window.localStorage.getItem(key);
      if (legacyValue !== null) {
        writeSession(key, legacyValue);
        window.localStorage.removeItem(key);
      }
      return legacyValue;
    },
    setItem(key, value) {
      writeSession(key, value);
      window.localStorage.removeItem(key);
    },
    removeItem(key) {
      removeCookies(key);
      window.localStorage.removeItem(key);
    },
  };
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
      detectSessionInUrl: true,
      storage: createNeuroartanAuthStorage(),
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
