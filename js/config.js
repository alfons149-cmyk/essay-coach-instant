// js/config.js
(function () {
  const host = location.hostname || "";
  const isLocal = host === "" || /^(localhost|127\.0\.0\.1|::1|0\.0\.0\.0|.+\.local)$/i.test(host);

  const qs = new URLSearchParams(location.search);
  const apiRoot = (qs.get("api") || (isLocal ? "http://127.0.0.1:8888"
                                             : "https://YOUR-LIVE-API.example.com"))
                    .replace(/\/+$/, "");

  window.EC = window.EC || {};
  window.EC.BASE_PATH = ""; // using Option A root (leave empty)

  window.EC_CONFIG = Object.freeze({
    API_BASE: apiRoot + "/api",
    REQUIRE_SUBSCRIPTION: false,
    SHOW_TRIAL: true,     // set false if you don’t want the trial button
    QUOTA_CAP: 20,
    TRIAL_DAYS: 2
  });

  window.EC.DEV_MODE = /[?&]dev=1\b/.test(location.search);

  window.SESSION = window.SESSION || { status:'inactive', email:null, token:null, trialStart:null, trialEnd:null };
  window.QUOTA   = window.QUOTA   || { used: 0, cap: window.EC_CONFIG.QUOTA_CAP || 20 };
})();
