// js/i18n.js
(function () {
  const I18N = {
    lang: 'en',
    dict: {},

    t(key, vars) {
      let s = I18N.dict[key] ?? '';
      if (vars && typeof s === 'string') {
        s = s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
      }
      return s || key; // fall back to the key so missing strings are obvious
    },

    // Apply translations to textContent and attributes in one pass
    applyAll() {
      // Text nodes
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = I18N.t(key);
      });

      // Placeholder attributes
      document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const key = el.getAttribute('data-i18n-ph');
        el.setAttribute('placeholder', I18N.t(key));
      });

      // Title (hover tooltip) attributes
      document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.setAttribute('title', I18N.t(key));
      });

      // Optional: document title
      const titleEl = document.querySelector('title[data-i18n]');
      if (titleEl) document.title = I18N.t(titleEl.getAttribute('data-i18n'));

      // Keep <html lang> correct (helps screen readers & grammar tools)
      document.documentElement.lang = I18N.lang;
    },

    async load(lang) {
      I18N.lang = lang || 'en';

      // Fetch from /essay-coach-instant/i18n/<lang>.json on GitHub Pages
      // The <base href="/essay-coach-instant/"> you set makes this relative path correct.
      const url = `i18n/${I18N.lang}.json`;

      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        I18N.dict = await res.json();
      } catch (err) {
        console.error('[i18n] load failed:', err);
        I18N.dict = {}; // keep going with empty dict
      }

      I18N.applyAll();
      return I18N.dict;
    }
  };

  // Expose globally
  window.I18N = I18N;

  // Auto-boot when DOM is ready, honoring localStorage
  document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('ec.lang') || 'en';
    I18N.load(saved);
  });
})();
