/* =========================================================
   00. FILE INDEX
   01. MODULE IDENTITY
   02. PAGE ACTIONS
   03. SHADER LAYER BOOTSTRAP
   04. PAGE INITIALIZATION
   ========================================================= */

/* =========================================================
   01. MODULE IDENTITY
   ========================================================= */

(function () {
  'use strict';

  const SHADER_FRAGMENT_PATH = '/assets/fragments/system/404-hero-shader.html';
  const SHADER_MOUNT_SELECTOR = '[data-404-shader-mount]';
  const SHADER_FRAGMENT_SELECTOR = '[data-404-hero-shader-fragment]';
  const SHADER_SCRIPT_SELECTOR = 'script[data-404-hero-shader-script]';
  const SHADER_BODY_READY_CLASS = 'page-404-shader-ready';
  const PAGE_READY_CLASS = 'page-404-ready';
  const PAGE_LEAVING_CLASS = 'page-404-leaving';

  /* =========================================================
     02. PAGE ACTIONS
     ========================================================= */

  function bind404Actions() {
    const homeLinks = Array.from(document.querySelectorAll('[data-404-home-link]'));
    const backButtons = Array.from(document.querySelectorAll('[data-404-back-button]'));

    homeLinks.forEach((link) => {
      if (link.__neuroartanBound) return;
      link.__neuroartanBound = true;

      link.addEventListener('click', () => {
        document.body.classList.add(PAGE_LEAVING_CLASS);
      });
    });

    backButtons.forEach((button) => {
      if (button.__neuroartanBound) return;
      button.__neuroartanBound = true;

      button.addEventListener('click', (event) => {
        event.preventDefault();

        if (window.history.length > 1) {
          document.body.classList.add(PAGE_LEAVING_CLASS);
          window.history.back();
          return;
        }

        document.body.classList.add(PAGE_LEAVING_CLASS);
        window.location.href = '/';
      });
    });
  }

  /* =========================================================
     03. SHADER LAYER BOOTSTRAP
     ========================================================= */

  function get404ShaderMount() {
    return document.querySelector(SHADER_MOUNT_SELECTOR);
  }

  function has404ShaderFragment() {
    return Boolean(document.querySelector(SHADER_FRAGMENT_SELECTOR));
  }

  function mark404ShaderReady() {
    document.body.classList.add(SHADER_BODY_READY_CLASS);
  }

  function activate404ShaderScript() {
    const dormantScript = document.querySelector(SHADER_SCRIPT_SELECTOR);

    if (!dormantScript || dormantScript.dataset.activated === 'true') {
      return;
    }

    const runtimeScript = document.createElement('script');
    runtimeScript.src = dormantScript.src;
    runtimeScript.defer = false;
    runtimeScript.dataset.activated = 'true';

    if (dormantScript.type) {
      runtimeScript.type = dormantScript.type;
    }

    dormantScript.dataset.activated = 'true';
    dormantScript.replaceWith(runtimeScript);
  }

  async function mount404ShaderLayer() {
    const mount = get404ShaderMount();

    if (!mount || has404ShaderFragment()) {
      if (has404ShaderFragment()) {
        activate404ShaderScript();
        mark404ShaderReady();
      }
      return;
    }

    try {
      const response = await fetch(SHADER_FRAGMENT_PATH, {
        credentials: 'same-origin',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Failed to load 404 shader fragment: ${response.status}`);
      }

      const html = await response.text();
      mount.innerHTML = html;
      activate404ShaderScript();
      mark404ShaderReady();
    } catch (error) {
      console.error('[404] Shader layer bootstrap failed.', error);
    }
  }

  /* =========================================================
     04. PAGE INITIALIZATION
     ========================================================= */

  async function init404Page() {
    document.body.classList.add(PAGE_READY_CLASS);
    bind404Actions();
    await mount404ShaderLayer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void init404Page();
    }, { once: true });
  } else {
    void init404Page();
  }
})();
