// js/i18n.js
(() => {
  const I18N = {
    _lang: "en",
    _dict: {},

    async loadLanguage(lang) {
      const code = (lang || "en").toLowerCase();
      const res = await fetch(`i18n/${code}.json`);
      if (!res.ok) {
        console.error("[i18n] Failed to load", code, res.status);
        I18N._dict = {};
        return;
      }
      I18N._dict = await res.json();
      I18N._lang = code;
      return I18N._dict;
    },

    t(key, vars) {
      if (!key) return "";
      const raw = I18N._dict[key];
      if (!raw || typeof raw !== "string") return key;

      if (!vars) return raw;

      // simple {n} substitution
      return raw.replace(/\{(\w+)\}/g, (_, k) =>
        vars[k] !== undefined ? String(vars[k]) : `{${k}}`
      );
    },

    getLanguage() {
      return I18N._lang;
    },

    setLanguage(lang) {
      return I18N.loadLanguage(lang);
    }
  };

  window.I18N = I18N;

  // Load initial language
  const initial =
    localStorage.getItem("ec.lang") ||
    document.documentElement.lang ||
    "en";

  I18N.loadLanguage(initial).catch((err) =>
    console.error("[i18n] initial load failed", err)
  );
})();
