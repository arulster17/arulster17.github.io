(function () {
  const path = window.location.pathname.replace(/\/index\.html$/, '/');

  function isActive(href) {
    if (href === '/') return path === '/';
    return path.startsWith(href);
  }

  function navLink(href, label) {
    const cls = isActive(href) ? ' class="active"' : '';
    return `<a href="${href}"${cls}>${label}</a>`;
  }

  const nav = `<nav>
  <a href="/" class="nav-name">arul mathur</a>
  <div class="nav-links">
    ${navLink('/', 'about')}
    ${navLink('/projects/', 'projects')}
    ${navLink('/blog/', 'blog')}
  </div>
</nav>`;

  const footer = `<footer>
  arul mathur &middot;
  <a href="https://github.com/arulster17" target="_blank" rel="noopener">github</a> &middot;
  <a href="https://www.linkedin.com/in/arulster17/" target="_blank" rel="noopener">linkedin</a>
</footer>`;

  const navEl = document.getElementById('nav-placeholder');
  const footerEl = document.getElementById('footer-placeholder');

  if (navEl) navEl.outerHTML = nav;
  if (footerEl) footerEl.outerHTML = footer;
})();
