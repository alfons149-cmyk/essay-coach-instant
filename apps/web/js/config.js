// js/config.js
(() => {
  const qs = new URLSearchParams(location.search);
  const API_Q = qs.get('api'); // optional runtime override
  const DEFAULT_API = 'https://essaycoach.alfons149.workers.dev/api';
  const API_BASE = (API_Q || DEFAULT_API).replace(/\/+$/,'');
  window.EC = Object.assign(window.EC || {}, { API_BASE });
  console.log('[EC] API_BASE =', window.EC.API_BASE);
})();

  // --- DEFAULT: set this to your real Worker once deployed ---
  // Example: https://essaycoach-api.youraccount.workers.dev/api
  const DEFAULT_API = 'https://<your-worker>.<your-account>.workers.dev/api';

  // Normalize: ensure it ends with /api (avoid double slashes later)
  function normalizeApiBase(s) {
    if (!s) return '';
    // strip trailing slashes
    let u = s.replace(/\/+$/, '');
    // append /api if not present
    if (!/\/api$/.test(u)) u += '/api';
    return u;
  }

  // Pick API base: query override > default
  const API_BASE = normalizeApiBase(API_Q || DEFAULT_API);

  // Expose one single config object
  window.EC = Object.assign(window.EC || {}, {
    VERSION: '2025.10.18',
    DEV,                 // app.js can read this if you want
    API_BASE: API_BASE || null
  });

  // Optional: small console hint in case of misconfig
  if (!API_BASE && !DEV) {
    console.warn('[EC] API_BASE is empty and dev mode is off. The app will not reach your backend.');
  } else {
    console.log('[EC] API_BASE =', API_BASE || '(mock via ?dev=1)');
  }
})();
