// Determine initial lang: ?lang → localStorage → /es path → default
(function initLangBoot() {
  const qs = new URLSearchParams(location.search);
  const qp = qs.get("lang");
  const stored = localStorage.getItem("ec_lang");
  const pathIsEs = location.pathname.replace(/\/+$/,"").endsWith("/es") || location.pathname.includes("/es/");
  const initial = qp || stored || (pathIsEs ? "es" : "en");
  window.__EC_LANG = initial;
  document.documentElement.setAttribute("lang", initial);
})();

// Load & apply on boot
const lang = window.__EC_LANG || "en";
loadI18n(lang).then(applyI18n).catch(console.error);

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
