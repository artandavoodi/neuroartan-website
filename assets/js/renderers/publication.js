// SECTION: PUBLICATION RENDERER
// PURPOSE: Load markdown from PTW-approved content_sync and render it into single.html.
// SCOPE: Support custom domains and GitHub Pages project paths.
// INPUT: Expected query format is single.html?p=<content_sync-relative-markdown-path>.

(function () {
  'use strict';

  // SECTION: QUERY AND STATE HELPERS
  function getQueryParam(name) {
    try {
      return new URL(window.location.href).searchParams.get(name);
    } catch {
      return null;
    }
  }

  function setLoadingState(titleText) {
    const t = document.getElementById('post-title');
    const c = document.getElementById('post-content');
    if (t) t.textContent = titleText || 'Loading…';
    if (c) c.innerHTML = '<p>Loading…</p>';
  }

  function setErrorState(message) {
    const t = document.getElementById('post-title');
    const c = document.getElementById('post-content');
    if (t) t.textContent = 'Publication';
    document.title = 'Publication • Neuroartan';
    if (c) c.innerHTML = `<p>${message}</p>`;
  }

  // SECTION: TITLE AND FRONTMATTER HELPERS
  function stripMdExtension(display) {
    return String(display || '').replace(/\.md$/i, '');
  }

  function titleFromPath(p) {
    try {
      const parts = String(p || '').split('/');
      const file = parts[parts.length - 1] || '';
      return stripMdExtension(decodeURIComponent(file));
    } catch {
      return 'Publication';
    }
  }

  function extractFrontmatter(md) {
    const source = String(md || '');
    if (!source.startsWith('---')) return {};

    const parts = source.split('\n');
    let endIndex = -1;
    for (let i = 1; i < parts.length; i++) {
      if (parts[i].trim() === '---') {
        endIndex = i;
        break;
      }
    }
    if (endIndex === -1) return {};

    const frontmatterLines = parts.slice(1, endIndex);
    const data = {};

    for (const line of frontmatterLines) {
      const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!match) continue;
      const key = match[1].trim();
      let value = match[2].trim();
      value = value.replace(/^['\"]|['\"]$/g, '');
      data[key] = value;
    }

    return data;
  }

  // SECTION: DOCUMENT META UPDATERS
  function updateDocumentMetadata(meta) {
    const title = String(meta.title || 'Publication').trim();
    const description = String(
      meta.description ||
      meta.summary ||
      meta.subtitle ||
      'Publication page for Neuroartan institutional writing, essays, notes, and research.'
    ).trim();
    const canonicalUrl = window.location.href;

    document.title = `${title} • Neuroartan`;

    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag) descriptionTag.setAttribute('content', description);

    const canonicalTag = document.getElementById('canonical-link');
    if (canonicalTag) canonicalTag.setAttribute('href', canonicalUrl);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${title} • Neuroartan`);

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', description);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);

    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', `${title} • Neuroartan`);

    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) twitterDescription.setAttribute('content', description);

    const schemaTag = document.getElementById('publication-schema');
    if (schemaTag) {
      schemaTag.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        mainEntityOfPage: canonicalUrl,
        publisher: {
          '@type': 'Organization',
          name: 'Neuroartan',
          url: 'https://neuroartan.com'
        }
      }, null, 2);
    }
  }

  // SECTION: FETCH AND LOAD HELPERS
  async function fetchText(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }

  async function loadMarkdown(p) {
    // Determine correct base path dynamically (supports custom domains + project pages)
    // Example:
    // - https://neuroartan.com/single.html -> base = https://neuroartan.com
    // - https://user.github.io/repo/single.html -> base = https://user.github.io/repo
    const base = window.location.origin + window.location.pathname.split('/single.html')[0];

    const cleanPath = String(p || '').replace(/^\/+/, '');
    const url = `${base}/content_sync/${cleanPath}?v=${Date.now()}`;

    const md = await fetchText(url);
    return { md, urlUsed: url };
  }

  // SECTION: MARKDOWN RENDERING
  function renderMarkdown(md) {
    if (!window.marked) throw new Error('marked not loaded');

    // Strip YAML frontmatter (between first two --- lines)
    let cleaned = md;
    if (cleaned.startsWith('---')) {
      const parts = cleaned.split('\n');
      let endIndex = -1;
      for (let i = 1; i < parts.length; i++) {
        if (parts[i].trim() === '---') {
          endIndex = i;
          break;
        }
      }
      if (endIndex !== -1) {
        cleaned = parts.slice(endIndex + 1).join('\n');
      }
    }

    return window.marked.parse(cleaned);
  }

  // SECTION: BOOTSTRAP
  async function boot() {
    const p = getQueryParam('p');
    if (!p) {
      setErrorState('Missing publication path. Provide ?p=Essays/your-file.md');
      return;
    }

    setLoadingState(titleFromPath(p));

    try {
      const { md } = await loadMarkdown(p);
      const html = renderMarkdown(md);
      const frontmatter = extractFrontmatter(md);

      const titleEl = document.getElementById('post-title');
      const contentEl = document.getElementById('post-content');

      const cleanTitle = String(frontmatter.title || titleFromPath(p)).trim();
      if (titleEl) titleEl.textContent = cleanTitle;
      if (contentEl) contentEl.innerHTML = html;

      updateDocumentMetadata({
        title: cleanTitle,
        description: frontmatter.description || frontmatter.summary || frontmatter.subtitle || ''
      });
    } catch (e) {
      setErrorState('Failed to load publication.');
      console.warn('[publication] load failed', e);
    }
  }

  // SECTION: INITIALIZATION
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0));
  } else {
    setTimeout(boot, 0);
  }
})();