// js/i18n.js
(() => {
  const FALLBACK = 'en';
  const SUPPORTED = ['en', 'es', 'nl'];

  // --- Determine initial language ---
  const qs = new URLSearchParams(location.search);
  const queryLang = qs.get('lang');
  const storedLang = localStorage.getItem('ec.lang');
  const browserLang = navigator.language.slice(0, 2).toLowerCase();

  // pick the first available option in this priority
  let initial = queryLang || storedLang || (SUPPORTED.includes(browserLang) ? browserLang : FALLBACK);

  // store for next visit
  localStorage.setItem('ec.lang', initial);
  document.documentElement.setAttribute('lang', initial);

  // --- Core loader ---
  async function load(lang) {
    const use = SUPPORTED.includes(lang) ? lang : FALLBACK;
    const res = await fetch(`i18n/${use}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`i18n load failed: ${use}`);
    const dict = await res.json();
    apply(dict);
  }

  function apply(dict) {
    // texts
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });
    // placeholders
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      if (dict[key]) el.setAttribute('placeholder', dict[key]);
    });
  }

  // expose globally
  window.I18N = { load };

  // boot automatically
  document.addEventListener('DOMContentLoaded', () => {
    load(initial).catch(e => console.warn(e));
  });
})();


  // -------- Lang resolution on first load --------
  function resolveInitialLang() {
    const qs = new URLSearchParams(location.search);
    const qp = qs.get('lang');

    const stored = localStorage.getItem(STORAGE_KEY);

    // path-based hint (/es/ or /nl/)
    const path = location.pathname.replace(/\/+$/, '');
    const pathHint =
      path.endsWith('/es') || path.includes('/es/') ? 'es' :
      path.endsWith('/nl') || path.includes('/nl/') ? 'nl' :
      null;

    const htmlLang = document.documentElement.lang;

    const cand = qp || stored || pathHint || htmlLang || FALLBACK;
    return SUPPORTED.includes(cand) ? cand : FALLBACK;
  }

  // -------- Fetch + apply --------
  async function load(lang) {
    const use = SUPPORTED.includes(lang) ? lang : FALLBACK;
    const res = await fetch(`i18n/${use}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`i18n load failed: ${use}`);
    DICT = await res.json();

    CURRENT = use;
    localStorage.setItem(STORAGE_KEY, use);
    document.documentElement.lang = use;

    translateDOM();
    // Notify listeners (counters etc.)
    window.dispatchEvent(new CustomEvent('ec:lang-changed', { detail: { lang: use } }));
    return DICT;
  }

  // -------- Translate helpers --------
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

  function translateDOM() {
    // text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    // placeholders
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      el.setAttribute('placeholder', t(key));
    });
  }

  // -------- Public API --------
  window.I18N = {
    load,
    t,
    get lang() { return CURRENT; },
    translateDOM
  };

  // -------- Auto boot on DOM ready --------
  document.addEventListener('DOMContentLoaded', () => {
    const init = resolveInitialLang();
    load(init).catch(e => console.warn('[i18n] boot failed', e));
  });

  // -------- Language buttons (delegated) --------
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lang]');
    if (!btn) return;
    const lang = btn.getAttribute('data-lang');
    if (!lang || lang === CURRENT) return;
    load(lang).catch(err => console.error('[i18n] load failed', err));
  });

  // -------- Optional: dynamic labels helper (safe) --------
  (function dynamicLabels() {
    const essayEl = document.getElementById('essay');
    const inEl    = document.getElementById('inWC');
    const outEl   = document.getElementById('outWC');
    const levelEl = document.getElementById('level');       // optional
    const targetEl= document.getElementById('p2TargetWC');  // optional

    if (!essayEl || !inEl) return; // not present on some pages

    function wordCount(s) {
      const t = String(s || '').trim();
      return t ? t.split(/\s+/).length : 0;
    }

    function p2TargetForLevel(lvl) {
      const map = {
        B2: { min: 140, max: 190, label: 'B2: 140–190' },
        C1: { min: 220, max: 260, label: 'C1: 220–260' },
        C2: { min: 240, max: 280, label: 'C2: 240–280' }
      };
      return map[lvl] || map.C1;
    }

    function refreshCounts() {
      const wc = wordCount(essayEl.value);
      inEl.textContent  = I18N.t('io.input_words',  { n: wc });
      if (outEl && outEl.textContent.includes('{n}')) {
        // if someone prefilled with a template string; keep it sane
        outEl.textContent = I18N.t('io.output_words', { n: wc });
      }
      if (levelEl && targetEl) {
        targetEl.textContent = p2TargetForLevel(levelEl.value).label;
      }
    }

    essayEl.addEventListener('input', refreshCounts);
    if (levelEl) levelEl.addEventListener('change', refreshCounts);
    window.addEventListener('ec:lang-changed', refreshCounts);

    refreshCounts();
  })();
})();
