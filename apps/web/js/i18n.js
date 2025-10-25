// js/i18n.js — single-source i18n with autodetect + dynamic labels
(() => {
  const FALLBACK    = 'en';
  const SUPPORTED   = ['en', 'es', 'nl'];
  const STORAGE_KEY = 'ec.lang';

  let CURRENT = FALLBACK;
  let DICT = {};

  // ---------- Utils ----------
  function format(str, params) {
    if (!params) return str;
    return String(str).replace(/\{(\w+)\}/g, (_, k) =>
      Object.prototype.hasOwnProperty.call(params, k) ? String(params[k]) : `{${k}}`
    );
  }
  function t(key, params) {
    const s = (DICT && DICT[key]) || key;
    return format(s, params);
  }

  // ---------- Initial language resolution ----------
  function resolveInitialLang() {
    const qs = new URLSearchParams(location.search);
    const qp = (qs.get('lang') || '').toLowerCase();

    const stored = (localStorage.getItem(STORAGE_KEY) || '').toLowerCase();

    const path = location.pathname.replace(/\/+$/, '');
    const pathHint =
      path.endsWith('/es') || path.includes('/es/') ? 'es' :
      path.endsWith('/nl') || path.includes('/nl/') ? 'nl' :
      null;

    const browser = (navigator.language || '').slice(0,2).toLowerCase();
    const htmlLang = (document.documentElement.lang || '').toLowerCase();

    const cand = qp || stored || pathHint || (SUPPORTED.includes(browser) ? browser : '') || htmlLang || FALLBACK;
    return SUPPORTED.includes(cand) ? cand : FALLBACK;
  }

  // ---------- Apply translations to DOM ----------
  function translateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key in DICT) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      if (key in DICT) el.setAttribute('placeholder', t(key));
    });
  }

  // ---------- Loader ----------
  async function load(lang) {
    const use = SUPPORTED.includes(lang) ? lang : FALLBACK;
    const res = await fetch(`i18n/${use}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`i18n load failed: ${use}`);

    DICT = await res.json();
    CURRENT = use;
    localStorage.setItem(STORAGE_KEY, use);
    document.documentElement.lang = use;

    translateDOM();
    // Let listeners (e.g., counters) update
    window.dispatchEvent(new CustomEvent('ec:lang-changed', { detail: { lang: use } }));
    return DICT;
  }

  // ---------- Expose API ----------
  window.I18N = {
    load,
    t,
    get lang() { return CURRENT; },
    translateDOM
  };

  // ---------- Auto boot ----------
  document.addEventListener('DOMContentLoaded', () => {
    const init = resolveInitialLang();
    load(init).catch(e => console.warn('[i18n] boot failed', e));
  });

  // ---------- Language buttons (delegated) ----------
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lang]');
    if (!btn) return;
    const lang = (btn.getAttribute('data-lang') || '').toLowerCase();
    if (!lang || lang === CURRENT) return;
    load(lang).catch(err => console.error('[i18n] load failed', err));
  });

  // ---------- Optional: dynamic labels / word counts ----------
  (function dynamicLabels() {
    const essayEl = document.getElementById('essay');
    const inEl    = document.getElementById('inWC');
    const outEl   = document.getElementById('outWC');
    if (!essayEl || !inEl) return;

    function wordCount(s) {
      const m = String(s || '').trim().match(/\S+/g);
      return m ? m.length : 0;
    }
    function refreshCounts() {
      const wc = wordCount(essayEl.value);
      inEl.textContent  = t('io.input_words',  { n: wc });
      // If output not yet set by backend, keep it aligned for UX
      if (outEl && outEl.textContent.includes('{n}')) {
        outEl.textContent = t('io.output_words', { n: wc });
      }
    }
    essayEl.addEventListener('input', refreshCounts);
    window.addEventListener('ec:lang-changed', refreshCounts);
    refreshCounts();
  })();
})();
