// /js/config.js
(window.__LOAD_ORDER ||= []).push('config');

(function () {
  const qs = new URLSearchParams(location.search);
  const host = location.hostname || "";
  const isLocal = host === "" || /^(localhost|127\.0\.0\.1|::1|0\.0\.0\.0|.+\.local)$/i.test(host);

  // 1) Take ?api= if present (e.g., ?api=https://foo.example.com)
  // 2) Else default depending on environment
  let apiRoot = qs.get("api")
    || (isLocal ? "http://127.0.0.1:8888"
                : "https://YOUR-LIVE-API.example.com");

  apiRoot = String(apiRoot).replace(/\/+$/, ""); // trim trailing slashes

  window.EC = window.EC || {};
  window.EC.BASE_PATH = ""; // keep empty on GitHub Pages

  window.EC_CONFIG = Object.freeze({
    API_BASE: apiRoot + "/api",
    REQUIRE_SUBSCRIPTION: false,
    SHOW_TRIAL: true,
    QUOTA_CAP: 20,
    TRIAL_DAYS: 2
  });

  window.EC.DEV_MODE = /[?&]dev=1\b/.test(location.search);
  window.SESSION = window.SESSION || { status:'inactive', email:null, token:null, trialStart:null, trialEnd:null };
  window.QUOTA   = window.QUOTA   || { used: 0, cap: window.EC_CONFIG.QUOTA_CAP || 20 };

  // Helpful debug line: you'll see what API_BASE is **right now**
  console.log('[CFG] API_BASE =', window.EC_CONFIG.API_BASE);
})();
