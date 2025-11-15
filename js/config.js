// js/config.js
(() => {
  const qs = new URLSearchParams(location.search);

  // Optional override via ?api=... and ?dev=1
  const API_Q   = qs.get('api');
  const DEV_QS  = qs.get('dev') === '1';

  // Default API for your Worker
  const DEFAULT_API = 'https://essaycoach.alfons149.workers.dev/api';

  // If index.html already set EC.API_BASE / EC.DEV, respect them,
  // otherwise fall back to these defaults / query params.
  const prior   = window.EC || {};
  const apiBase = (API_Q || prior.API_BASE || DEFAULT_API || '').replace(/\/+$/, '');
  const devFlag = (typeof prior.DEV === 'boolean') ? prior.DEV : DEV_QS;

  window.EC = Object.assign({}, prior, {
    API_BASE: apiBase,
    DEV: devFlag
  });

  console.log('[EC config] API_BASE =', window.EC.API_BASE || '(mock)', 'DEV?', window.EC.DEV);
})();
