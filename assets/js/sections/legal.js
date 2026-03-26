// /website/assets/js/sections/legal.js

(function () {
  'use strict';

  /* =================== Helpers =================== */
  function q(selector, root = document) {
    return root.querySelector(selector);
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

  /* =================== Render =================== */
  function renderLegalPage(data) {
    if (!data) return;

    document.documentElement.classList.add('legal-page');
    document.body.classList.add('legal-page');

    if (data.pageTitle) {
      document.title = data.pageTitle;
    }

    setText('[data-legal-eyebrow]', data.eyebrow || 'Public Legal Page');
    setText('[data-legal-title]', data.title || 'Legal Page');
    setText('[data-legal-intro]', data.intro || '');

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
  }

  /* =================== Init =================== */
  document.addEventListener('DOMContentLoaded', async () => {
    const shell = getLegalShell();
    if (!shell) return;

    const data = await loadLegalData(shell);
    if (!data) return;

    renderLegalPage(data);
  });
})();