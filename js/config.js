// client/js/config.js
(function () {
  // ---------- Environment detection ----------
  const host = location.hostname || ""; // handles file:// (empty host)
  const isLocal = host === "" || /^(localhost|127\.0\.0\.1|::1|0\.0\.0\.0|.+\.local)$/i.test(host);

  // ---------- Query param overrides ----------
  const qs = new URLSearchParams(location.search);

  // API root override (?api=https://api.example.com)
  const apiRoot =
    (qs.get("api") ||
     (isLocal ? "http://127.0.0.1:8888" : "https://YOUR-LIVE-API.example.com"))
    .replace(/\/+$/, "");

  // Optional base path override (?base=/essay-coach-instant)
  const baseOverride = (qs.get("base") || "").replace(/\/+$/, "");

  // Feature flags via query string
  const qpRequireSub = qs.get("requireSub");   // ?requireSub=1
  const qpShowTrial  = qs.get("trial");        // ?trial=1 (or 0)
  const qpQuotaCap   = qs.get("quota");        // ?quota=50
  const qpTrialDays  = qs.get("trialDays");    // ?trialDays=3
  const qpDev        = qs.get("dev");          // ?dev=1

  // ---------- Globals expected by app.js ----------
  window.EC = window.EC || {};

  // If you deploy under a subpath, set it here (or via ?base=...)
  // Example GitHub Pages: "/essay-coach-instant"
  window.EC.BASE_PATH = baseOverride || (isLocal ? "" : "/essay-coach-instant");

  // Central config used everywhere
  const REQUIRE_SUBSCRIPTION_DEFAULT = false;
  const SHOW_TRIAL_DEFAULT = false;        // default off; turn on locally via ?trial=1
  const QUOTA_CAP_DEFAULT = 20;
  const TRIAL_DAYS_DEFAULT = 2;

  const REQUIRE_SUBSCRIPTION =
    qpRequireSub != null ? qpRequireSub === "1" : REQUIRE_SUBSCRIPTION_DEFAULT;

  const SHOW_TRIAL =
    qpShowTrial != null ? qpShowTrial === "1" : SHOW_TRIAL_DEFAULT;

  const QUOTA_CAP =
    qpQuotaCap != null ? Math.max(1, Number(qpQuotaCap) || QUOTA_CAP_DEFAULT) : QUOTA_CAP_DEFAULT;

  const TRIAL_DAYS =
    qpTrialDays != null ? Math.max(1, Number(qpTrialDays) || TRIAL_DAYS_DEFAULT) : TRIAL_DAYS_DEFAULT;

  window.EC_CONFIG = Object.freeze({
    API_BASE: apiRoot + "/api",
    REQUIRE_SUBSCRIPTION,
    SHOW_TRIAL,
    QUOTA_CAP,
    TRIAL_DAYS
  });

  // Dev mode toggle (skips paywall checks in app.js where applicable)
  window.EC.DEV_MODE = qpDev === "1";

  // ---------- Safe defaults for session/quota (used by app.js) ----------
  window.SESSION = window.SESSION || {
    status: "inactive",
    email: null,
    token: null,
    trialStart: null,
    trialEnd: null
  };
  window.QUOTA = window.QUOTA || {
    used: 0,
    cap: window.EC_CONFIG.QUOTA_CAP
  };

  // ---------- Optional: hide/disable Start Trial when trials are off ----------
  // Avoids an inert button if SHOW_TRIAL=false
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btnStartTrial");
    if (!btn) return;
    if (!window.EC_CONFIG.SHOW_TRIAL) {
      // Pick one of the two behaviors; hiding is simplest/cleanest:
      btn.style.display = "none";

      // Or, if you prefer to keep it visible but disabled:
      // btn.disabled = true;
      // btn.setAttribute("aria-disabled","true");
      // btn.title = "Trials are currently unavailable";
    }
  });

  // ---------- Local-dev nicety: prevent stale Service Workers ----------
  if (isLocal && "serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
  }
})();
