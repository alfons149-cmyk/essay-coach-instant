// js/i18n.js (clean)
(() => {
  const FALLBACK = 'en';
  const SUPPORTED = ['en','es','nl'];
  let CURRENT = null;
  let DICT = {};

  function format(str, params) {
    if (!params) return str;
    return String(str).replace(/\{(\w+)\}/g, (_, k) => (k in params ? params[k] : `{${k}}`));
  }

  function t(key, params) {
    const s = (DICT && DICT[key]) || key;
    return format(s, params);
  }

  function translateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      el.setAttribute('placeholder', t(key));
    });
    // tell counters/UI to refresh
    window.dispatchEvent(new CustomEvent('ec:lang-changed', { detail: { lang: CURRENT } }));
  }

  async function load(lang) {
    const use = SUPPORTED.includes(lang) ? lang : FALLBACK;
    const res = await fetch(`i18n/${use}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`i18n load failed: ${use}`);
    DICT = await res.json();
    CURRENT = use;
    localStorage.setItem('ec.lang', use);
    document.documentElement.lang = use;
    translateDOM();
    return DICT;
  }

  function resolveInitial() {
    const qs = new URLSearchParams(location.search);
    const qp = qs.get('lang');
    const stored = localStorage.getItem('ec.lang');
    const htmlLang = document.documentElement.lang;
    const cand = qp || stored || htmlLang || FALLBACK;
    return SUPPORTED.includes(cand) ? cand : FALLBACK;
  }

  window.I18N = { load, t, get lang(){ return CURRENT; } };

  document.addEventListener('DOMContentLoaded', () => {
    load(resolveInitial()).catch(err => console.warn('[i18n boot]', err));
  });
})();
