// Determine initial lang: ?lang → localStorage → /es path → default
(function initLangBoot() {
  const qs = new URLSearchParams(location.search);
  const qp = qs.get("lang");
  const stored = localStorage.getItem("ec_lang");
  const pathIsEs = location.pathname.replace(/\/+$/,"").endsWith("/es") || location.pathname.includes("/es/");
  const initial = qp || stored || (pathIsEs ? "es" : "en");
  const SUPPORTED = ["en", "es", "nl"]; // <— nl toegevoegd
  window.__EC_LANG = initial;
  document.documentElement.setAttribute("lang", initial);
})();

// js/i18n.js
(() => {
  const FALLBACK = 'en';
  const SUPPORTED = ['en', 'es', 'nl'];

  async function load(lang) {
    const use = SUPPORTED.includes(lang) ? lang : FALLBACK;
    const res = await fetch(`i18n/${use}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`i18n load failed: ${use}`);
    const dict = await res.json();
    localStorage.setItem('ec.lang', use);
    translate(dict);
  }

  function t(key, dict) {
    return (dict && dict[key]) || key;
  }

  function translate(dict) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'), dict);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'), dict));
    });
  }

  window.I18N = { load };
  // auto-boot once DOM is ready (page decides default language)
  document.addEventListener('DOMContentLoaded', () => {
    const init = localStorage.getItem('ec.lang') || document.documentElement.lang || FALLBACK;
    I18N.load(init).catch(e => console.warn(e));
  });
})();

// Wire language buttons
document.addEventListener("DOMContentLoaded", () => {
  const btnEn = document.getElementById("btnLangEn");
  const btnEs = document.getElementById("btnLangEs");
  if (btnEn) btnEn.addEventListener("click", () => i18nSetLang("en"));
  if (btnEs) btnEs.addEventListener("click", () => i18nSetLang("es"));
});

// Example: use t() for dynamic labels (word-count pills etc.)
(function setupDynamicLabels(){
  const essayEl = document.getElementById("essay");
  const inEl = document.getElementById("inWC");
  const outEl = document.getElementById("outWC");
  const lvlEl = document.getElementById("level");
  const targetEl = document.getElementById("p2TargetWC");

  function wordCount(s){ return (s||"").trim().split(/\s+/).filter(Boolean).length; }
  function p2TargetForLevel(lvl){
    const map={B2:{min:140,max:190,label:"B2: 140–190"}, C1:{min:220,max:260,label:"C1: 220–260"}, C2:{min:240,max:280,label:"C2: 240–280"}};
    return map[lvl]||map.C1;
  }

  function refreshCounts(){
    const wc = wordCount(essayEl.value);
    inEl.textContent = t("io.input_words", { n: wc });
    targetEl.textContent = p2TargetForLevel(lvlEl.value).label;
  }
  essayEl.addEventListener("input", refreshCounts);
  lvlEl.addEventListener("change", refreshCounts);
  window.addEventListener("ec:lang-changed", refreshCounts);
  refreshCounts();

  // If you set outEl dynamically after correction, use:
  // outEl.textContent = t("io.output_words", { n: someNumber });
})();

  // placeholders (e.g., <textarea data-i18n-placeholder="placeholders.task">…</textarea>)
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict && dict[key]) el.setAttribute('placeholder', dict[key]);
  });
}
