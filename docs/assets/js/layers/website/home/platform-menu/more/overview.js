function getMoreSurface(root) {
  if (!(root instanceof Element)) {
    return null;
  }

  return root.querySelector('[data-home-platform-destination-surface]') || root;
}

function renderLinkGroup(title, eyebrow, copy, links = []) {
  return `
    <article class="home-platform-more__card">
      <p class="home-platform-more__eyebrow">${eyebrow}</p>
      <h3 class="home-platform-more__title">${title}</h3>
      <p class="home-platform-more__copy">${copy}</p>
      <div class="home-platform-more__links">
        ${links.map((entry) => `<a class="home-platform-more__link" href="${entry.href}">${entry.label}</a>`).join('')}
      </div>
    </article>
  `;
}

export function mountHomePlatformDestination(root) {
  const surface = getMoreSurface(root);
  if (!surface) {
    return;
  }

  surface.innerHTML = `
    <div class="home-platform-more__grid">
      ${renderLinkGroup(
        'Institutional Surfaces',
        'Institutional',
        'Company, product, and public-system routes stay available here without diluting the primary platform shell.',
        [
          { label: 'About', href: '/pages/about/index.html' },
          { label: 'Leadership', href: '/pages/company/leadership/index.html' },
          { label: 'Sitemap', href: '/pages/sitemap/index.html' }
        ]
      )}

      ${renderLinkGroup(
        'Legal & Trust',
        'Legal',
        'Privacy, terms, disclosures, and trust-sensitive public surfaces remain grouped under one calm institutional lane.',
        [
          { label: 'Privacy Policy', href: '/pages/legal/privacy/index.html' },
          { label: 'Terms of Use', href: '/pages/legal/terms/index.html' },
          { label: 'Privacy Center', href: '/pages/trust/privacy-center/index.html' }
        ]
      )}

      ${renderLinkGroup(
        'Support & Growth',
        'Support',
        'Support, careers, and route expansion surfaces stay available here while the product shell remains disciplined.',
        [
          { label: 'Careers', href: '/pages/careers/index.html' },
          { label: 'Help Center', href: '/pages/support/help-center/index.html' },
          { label: 'Continuity History', href: '/pages/continuity-history/index.html' }
        ]
      )}
    </div>
  `;
}
