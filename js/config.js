// js/config.js
(() => {
  const qs   = new URLSearchParams(location.search);
  const DEV  = qs.get('dev') === '1';
  const API_Q = qs.get('api'); // optional override via ?api=...

  // Your real Worker endpoint (already exists)
  const DEFAULT_API = 'https://essaycoach.alfons149.workers.dev/api';

  function normalizeApiBase(s) {
    if (!s) return '';
    return s.replace(/\/+$/, '');
  }

  const API_BASE = normalizeApiBase(API_Q || DEFAULT_API);

  window.EC = Object.assign(window.EC || {}, {
    DEV,
    API_BASE
  });

  console.log('[EC config] DEV =', DEV, 'API_BASE =', API_BASE || '(mock)');
})();
