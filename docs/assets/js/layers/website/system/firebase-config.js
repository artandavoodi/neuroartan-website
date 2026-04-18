/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) MODULE STATE
   03) FIREBASE CONFIGURATION
   04) FIREBASE SDK ASSETS
   05) FIREBASE AVAILABILITY HELPERS
   06) SCRIPT LOAD HELPERS
   07) FIREBASE READINESS EVENTS
   08) FIREBASE INITIALIZATION
   09) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/firebase-config.js */

(() => {
  'use strict';

  /* =============================================================================
     02) MODULE STATE
  ============================================================================= */
  let readyWatchBound = false;
  let initialized = false;
  let sdkLoadPromise = null;
  let bootPromise = null;

  /* =============================================================================
     03) FIREBASE CONFIGURATION
  ============================================================================= */
  const firebaseConfig = {
    apiKey: 'AIzaSyDyts8mOZou6K1qPLYR2AQugR0RFwyDS8s',
    authDomain: 'artan-c7554.firebaseapp.com',
    projectId: 'artan-c7554',
    storageBucket: 'artan-c7554.firebasestorage.app',
    messagingSenderId: '125487592764',
    appId: '1:125487592764:web:734f02aec52b6bac4c9a39',
    measurementId: 'G-JJWZXLBF8B'
  };

  /* =============================================================================
     04) FIREBASE SDK ASSETS
  ============================================================================= */
  const FIREBASE_SDK_VERSION = '9.23.0';
  const FIREBASE_SDK_SOURCES = [
    `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app-compat.js`,
    `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth-compat.js`,
    `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore-compat.js`
  ];

  /* =============================================================================
     05) FIREBASE AVAILABILITY HELPERS
  ============================================================================= */
  function hasFirebaseRuntime() {
    return !!(window.firebase && Array.isArray(window.firebase.apps));
  }

  function hasFirebaseAuthRuntime() {
    return !!(hasFirebaseRuntime() && typeof window.firebase.auth === 'function');
  }

  function hasFirebaseFirestoreRuntime() {
    return !!(hasFirebaseRuntime() && typeof window.firebase.firestore === 'function');
  }

  function hasRequiredFirebaseRuntime() {
    return hasFirebaseAuthRuntime() && hasFirebaseFirestoreRuntime();
  }

  /* =============================================================================
     06) SCRIPT LOAD HELPERS
  ============================================================================= */
  function findExistingScript(src) {
    const resolved = new URL(src, window.location.origin).href;

    return Array.from(document.querySelectorAll('script[src]')).find((script) => {
      const currentSrc = script.getAttribute('src') || '';

      try {
        return new URL(currentSrc, window.location.origin).href === resolved;
      } catch (_) {
        return currentSrc === src;
      }
    }) || null;
  }

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const existing = findExistingScript(src);
      const onLoad = () => resolve();
      const onError = () => reject(new Error(`Failed to load Firebase SDK: ${src}`));

      if (existing) {
        if (existing.dataset.scriptLoaded === 'true') {
          resolve();
          return;
        }

        existing.addEventListener('load', () => {
          existing.dataset.scriptLoaded = 'true';
          onLoad();
        }, { once: true });
        existing.addEventListener('error', onError, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.addEventListener('load', () => {
        script.dataset.scriptLoaded = 'true';
        onLoad();
      }, { once: true });
      script.addEventListener('error', onError, { once: true });
      document.head.appendChild(script);
    });
  }

  async function ensureFirebaseSdk() {
    if (hasRequiredFirebaseRuntime()) return true;

    if (!sdkLoadPromise) {
      sdkLoadPromise = Promise.all(FIREBASE_SDK_SOURCES.map((src) => loadScriptOnce(src)))
        .catch((error) => {
          sdkLoadPromise = null;
          throw error;
        });
    }

    await sdkLoadPromise;
    return hasRequiredFirebaseRuntime();
  }

  /* =============================================================================
     07) FIREBASE READINESS EVENTS
  ============================================================================= */
  function dispatchFirebaseReady() {
    document.dispatchEvent(new CustomEvent('neuroartan:firebase-ready', {
      detail: {
        appName: '[DEFAULT]',
        hasAuth: hasFirebaseAuthRuntime(),
        hasFirestore: hasFirebaseFirestoreRuntime()
      }
    }));
  }

  function bindFirebaseReadyWatch() {
    if (readyWatchBound) return;
    readyWatchBound = true;

    window.addEventListener('load', () => {
      void boot();
    }, { once: true });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      void boot();
    });
  }

  /* =============================================================================
     08) FIREBASE INITIALIZATION
  ============================================================================= */
  async function boot() {
    if (initialized) return;
    if (typeof window === 'undefined') return;

    bindFirebaseReadyWatch();

    if (bootPromise) {
      await bootPromise;
      return;
    }

    bootPromise = (async () => {
      const sdkReady = await ensureFirebaseSdk();
      if (!sdkReady || !hasFirebaseRuntime()) return;

      if (!window.firebase.apps.length) {
        window.firebase.initializeApp(firebaseConfig);
      }

      initialized = true;
      dispatchFirebaseReady();
    })()
      .catch((error) => {
        console.error('Firebase bootstrap failed:', error);
      })
      .finally(() => {
        bootPromise = null;
      });

    await bootPromise;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void boot();
    }, { once: true });
  } else {
    void boot();
  }
})();

/* =============================================================================
   09) END OF FILE
============================================================================= */
