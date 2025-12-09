// js/i18n.js — JSON-based i18n helper

(function () {
  const I18N = {
    lang: "en",
    dict: {},

    // Translation lookup with simple {var} interpolation
    t(key, vars) {
      let s = I18N.dict[key] ?? "";
      if (vars && typeof s === "string") {
        s = s.replace(/\{(\w+)\}/g, (_, k) =>
          Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : `{${k}}`
        );
      }
      return s || key; // fall back to key to spot missing strings
    },

    // Apply translations to the DOM
    applyAll() {
      // textContent
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        el.textContent = I18N.t(key);
      });

      // placeholders — support BOTH data-i18n-ph and data-i18n-placeholder
      document
        .querySelectorAll("[data-i18n-ph],[data-i18n-placeholder]")
        .forEach((el) => {
          const key =
            el.getAttribute("data-i18n-ph") ||
            el.getAttribute("data-i18n-placeholder");
          if (key) {
            el.setAttribute("placeholder", I18N.t(key));
          }
        });

      // titles / tooltips
      document.querySelectorAll("[data-i18n-title]").forEach((el) => {
        const key = el.getAttribute("data-i18n-title");
        el.setAttribute("title", I18N.t(key));
      });

      // document <title>
      const titleEl = document.querySelector("title[data-i18n]");
      if (titleEl) {
        document.title = I18N.t(titleEl.getAttribute("data-i18n"));
      }

      // keep <html lang=".."> in sync
      document.documentElement.lang = I18N.lang;
    },

    // Load a language JSON and then apply it
    async load(lang) {
      I18N.lang = lang || "en";
      const url = `assets/i18n/${I18N.lang}.json`;
      console.log("[i18n] loading", I18N.lang, "→", url);

      try {
        const res = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        I18N.dict = await res.json();
      } catch (e) {
        console.warn("[i18n] load failed, falling back to EN:", e);
        const res = await fetch(`assets/i18n/en.json?v=${Date.now()}`, {
          cache: "no-store",
        });
        I18N.lang = "en";
        I18N.dict = await res.json();
      }

      I18N.applyAll();
      return I18N.dict;
    },
  };

  // ✅ API that app.js expects
  I18N.setLanguage = function (lang) {
    return I18N.load(lang);
  };
  I18N.loadLanguage = function (lang) {
    return I18N.load(lang);
  };

  // Expose globally
  window.I18N = I18N;

  // Initial boot
  document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("ec.lang") || "en";
    I18N.load(saved);
  });
})();
