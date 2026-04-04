// /website/assets/js/sections/legal.js

(function () {
  'use strict';

  /* =================== Helpers =================== */
  function q(selector, root = document) {
    return root.querySelector(selector);
  }

  function qa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function setText(selector, value, root = document) {
    const element = q(selector, root);
    if (!element) return;
    element.textContent = value;
  }

  function setHTML(selector, value, root = document) {
    const element = q(selector, root);
    if (!element) return;
    element.innerHTML = value;
  }

  function setAttr(selector, attribute, value, root = document) {
    const element = q(selector, root);
    if (!element) return;
    element.setAttribute(attribute, value);
  }

  function upsertMeta(selector, attribute, value) {
    if (!value) return;
    const element = q(selector);
    if (!element) return;
    element.setAttribute(attribute, value);
  }

  function requireDocumentId(data) {
    const documentId = String(data?.document_id || data?.source_document_id || '').trim();

    if (!documentId) {
      throw new Error('Legal sync source is missing required document_id.');
    }

    return documentId;
  }

  function validateLegalContract(data, shell) {
    const contractVersion = String(data?.contract_version || '').trim();
    const destinationClass = String(data?.destination_class || '').trim();
    const routeFamily = String(data?.route_family || '').trim();
    const routePath = String(data?.route_path || '').trim();
    const shellFamily = String(data?.shell_family || '').trim();
    const renderFamily = String(data?.render_family || '').trim();
    const page = String(data?.page || '').trim();
    const expectedPage = String(shell?.dataset?.legalPage || '').trim();

    if (!contractVersion) {
      throw new Error('Legal sync source is missing required contract_version.');
    }

    if (destinationClass !== 'legal_page') {
      throw new Error(`Legal sync source has invalid destination_class: ${destinationClass || 'undefined'}`);
    }

    if (routeFamily !== 'pages/legal') {
      throw new Error(`Legal sync source has invalid route_family: ${routeFamily || 'undefined'}`);
    }

    if (!routePath) {
      throw new Error('Legal sync source is missing required route_path.');
    }

    if (shellFamily !== 'legal') {
      throw new Error(`Legal sync source has invalid shell_family: ${shellFamily || 'undefined'}`);
    }

    if (renderFamily !== 'legal') {
      throw new Error(`Legal sync source has invalid render_family: ${renderFamily || 'undefined'}`);
    }

    if (!page) {
      throw new Error('Legal sync source is missing required page.');
    }

    if (expectedPage && page !== expectedPage) {
      throw new Error(`Legal sync page mismatch. Expected ${expectedPage}, received ${page}.`);
    }

    return {
      contractVersion,
      destinationClass,
      routeFamily,
      routePath,
      shellFamily,
      renderFamily,
      page
    };
  }

  function createMetaItem(text) {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }

  function createParagraph(text) {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    return paragraph;
  }

  function createList(items, ordered = false) {
    const list = document.createElement(ordered ? 'ol' : 'ul');

    items.forEach((item) => {
      const li = document.createElement('li');

      if (typeof item === 'string') {
        li.textContent = item;
      } else if (item && typeof item === 'object') {
        if (item.html) {
          li.innerHTML = item.html;
        } else {
          li.textContent = item.text || '';
        }
      }

      list.appendChild(li);
    });

    return list;
  }

  function createSection(section) {
    const wrapper = document.createElement('section');
    wrapper.className = 'legal-page-section';

    if (section.id) {
      wrapper.id = section.id;
    }

    const heading = document.createElement('h2');
    heading.textContent = section.title || '';
    wrapper.appendChild(heading);

    (section.paragraphs || []).forEach((paragraph) => {
      if (typeof paragraph === 'string') {
        wrapper.appendChild(createParagraph(paragraph));
        return;
      }

      const p = document.createElement('p');
      if (paragraph && paragraph.html) {
        p.innerHTML = paragraph.html;
      } else {
        p.textContent = paragraph?.text || '';
      }
      wrapper.appendChild(p);
    });

    if (Array.isArray(section.list) && section.list.length) {
      wrapper.appendChild(createList(section.list, false));
    }

    if (Array.isArray(section.orderedList) && section.orderedList.length) {
      wrapper.appendChild(createList(section.orderedList, true));
    }

    if (section.callout) {
      const callout = document.createElement('div');
      callout.className = 'legal-page-callout';

      if (Array.isArray(section.callout)) {
        section.callout.forEach((line) => {
          const row = document.createElement('div');
          row.textContent = line;
          callout.appendChild(row);
        });
      } else {
        callout.textContent = section.callout;
      }

      wrapper.appendChild(callout);
    }

    return wrapper;
  }

  /* =================== Source Resolution =================== */
  function getLegalShell() {
    return q('[data-legal-page]');
  }

  function getLegalSyncPath(shell) {
    if (!shell) return '';
    return String(shell.dataset.legalSyncPath || '').trim();
  }

  async function loadLegalData(shell) {
    const syncPath = getLegalSyncPath(shell);

    if (!syncPath) {
      console.warn('Legal page sync path is not defined. Rendering skipped until Vault-synced source is connected.');
      return null;
    }

    try {
      const response = await fetch(syncPath, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to load legal sync source: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to load legal page data:', error);
      return null;
    }
  }

  /* =================== Metadata Sync =================== */
  function applyDocumentMetadata(data) {
    if (!data) return;
    const documentId = requireDocumentId(data);
    const contract = validateLegalContract(data, getLegalShell());

    if (data.pageTitle) {
      document.title = data.pageTitle;
      setText('h1[style*="position:absolute"]', data.pageTitle);
    }

    if (data.description) {
      upsertMeta('meta[name="description"]', 'content', data.description);
      upsertMeta('meta[property="og:description"]', 'content', data.description);
      upsertMeta('meta[name="twitter:description"]', 'content', data.description);
    }

    if (data.pageTitle) {
      upsertMeta('meta[property="og:title"]', 'content', data.pageTitle);
      upsertMeta('meta[name="twitter:title"]', 'content', data.pageTitle);
    }

    if (data.canonicalUrl) {
      setAttr('link[rel="canonical"]', 'href', data.canonicalUrl);
      upsertMeta('meta[property="og:url"]', 'content', data.canonicalUrl);
    }

    if (data.robots) {
      upsertMeta('meta[name="robots"]', 'content', data.robots);
    }
    upsertMeta('meta[name="document-id"]', 'content', documentId);
    upsertMeta('meta[name="legal-contract-version"]', 'content', contract.contractVersion);
    upsertMeta('meta[name="legal-route-family"]', 'content', contract.routeFamily);
    upsertMeta('meta[name="legal-route-path"]', 'content', contract.routePath);

    if (data.lang) {
      document.documentElement.lang = data.lang;
    }

    if (data.structuredData) {
      const script = q('script[type="application/ld+json"]');
      if (script) {
        const structuredData = {
          ...data.structuredData,
          identifier: data.structuredData.identifier || documentId
        };

        if (data.lastUpdated && !structuredData.dateModified) {
          structuredData.dateModified = data.lastUpdated;
        }

        script.textContent = JSON.stringify(structuredData, null, 2);
      }
    }
  }

  /* =================== Render =================== */
  function renderLegalPage(data) {
    if (!data) return;
    const documentId = requireDocumentId(data);
    const shell = getLegalShell();
    const contract = validateLegalContract(data, shell);

    if (shell) {
      shell.setAttribute('data-legal-render-state', 'ready');
      shell.setAttribute('data-legal-document-id', documentId);
      shell.setAttribute('data-legal-contract-version', contract.contractVersion);
      shell.setAttribute('data-legal-route-family', contract.routeFamily);
      shell.setAttribute('data-legal-route-path', contract.routePath);
      shell.setAttribute('data-legal-shell-family', contract.shellFamily);
      shell.setAttribute('data-legal-render-family', contract.renderFamily);

      if (data.effectiveDate) {
        shell.setAttribute('data-effective-date', data.effectiveDate);
      }

      if (data.lastUpdated) {
        shell.setAttribute('data-last-updated', data.lastUpdated);
      }
    }

    applyDocumentMetadata(data);

    setText('[data-legal-eyebrow]', data.eyebrow || 'Public Legal Page');
    setText('[data-legal-title]', data.title || 'Legal Page');
    setText('[data-legal-intro]', data.intro || '');

    const siteMain = q('#site-main');
    if (siteMain) {
      siteMain.setAttribute('data-document-id', documentId);

      if (data.effectiveDate) {
        siteMain.setAttribute('data-effective-date', data.effectiveDate);
      }

      if (data.lastUpdated) {
        siteMain.setAttribute('data-last-updated', data.lastUpdated);
      }
    }
    if (siteMain) {
      siteMain.setAttribute('data-contract-version', contract.contractVersion);
      siteMain.setAttribute('data-route-family', contract.routeFamily);
      siteMain.setAttribute('data-route-path', contract.routePath);
    }

    const metaList = q('[data-legal-meta]');
    if (metaList) {
      metaList.innerHTML = '';
      (data.meta || []).forEach((entry) => {
        metaList.appendChild(createMetaItem(entry));
      });
    }

    const content = q('[data-legal-content]');
    if (content) {
      content.innerHTML = '';
      (data.sections || []).forEach((section) => {
        content.appendChild(createSection(section));
      });
    }

    if (data.footerHtml) {
      setHTML('[data-legal-footer]', data.footerHtml);
    }

    if (shell) {
      shell.dispatchEvent(new CustomEvent('legal:rendered', {
        bubbles: true,
        detail: {
          page: contract.page,
          syncPath: shell.dataset.legalSyncPath || '',
          documentId,
          contractVersion: contract.contractVersion,
          routeFamily: contract.routeFamily,
          routePath: contract.routePath,
          shellFamily: contract.shellFamily,
          renderFamily: contract.renderFamily,
          effectiveDate: data.effectiveDate || '',
          lastUpdated: data.lastUpdated || ''
        }
      }));
    }
  }

  /* =================== Init =================== */
  document.addEventListener('DOMContentLoaded', async () => {
    const shell = getLegalShell();
    if (!shell) return;

    shell.setAttribute('data-legal-render-state', 'loading');
    shell.setAttribute('data-legal-shell-family', 'legal');

    try {
      const data = await loadLegalData(shell);
      if (!data) {
        shell.setAttribute('data-legal-render-state', 'failed');
        return;
      }

      renderLegalPage(data);
    } catch (error) {
      console.error('Failed to render legal page:', error);
      shell.setAttribute('data-legal-render-state', 'failed');
    }
  });
})();