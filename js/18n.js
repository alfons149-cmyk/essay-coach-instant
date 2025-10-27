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
      return s || key; // fall back to key to spot missing strings
    },

    applyAll() {
      // textContent
      document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = I18N.t(el.getAttribute('data-i18n'));
      });
      // placeholders
      document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        el.setAttribute('placeholder', I18N.t(el.getAttribute('data-i18n-ph')));
      });
      // titles / tooltips
      document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.setAttribute('title', I18N.t(el.getAttribute('data-i18n-title')));
      });
      // document title
      const titleEl = document.querySelector('title[data-i18n]');
      if (titleEl) document.title = I18N.t(titleEl.getAttribute('data-i18n'));
      // keep <html lang> correct
      document.documentElement.lang = I18N.lang;
    },

    async load(lang) {
      I18N.lang = lang || 'en';
      const url = `assets/i18n/${I18N.lang}.json`;   // ← build URL *here*, after lang is known
      console.log('[i18n] loading', I18N.lang, '→', url);

      try {
        const res = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        I18N.dict = await res.json();
      } catch (e) {
        console.warn('[i18n] load failed, falling back to EN:', e);
        const res = await fetch(`assets/i18n/en.json?v=${Date.now()}`, { cache: 'no-store' });
        I18N.lang = 'en';
        I18N.dict = await res.json();
      }

      I18N.applyAll();
      return I18N.dict;
    }
  };

  // expose globally
  window.I18N = I18N;

  // auto-boot
  document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('ec.lang') || 'en';
    I18N.load(saved);
  });
})();
