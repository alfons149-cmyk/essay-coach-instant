// js/config.js
(() => {
  const qs   = new URLSearchParams(location.search);
  const DEV  = qs.get('dev') === '1';
  const API_Q = qs.get('api'); // Only the configured service may receive essay text.

  // Your real Worker endpoint (already exists)
  const DEFAULT_API = 'https://essaycoach.alfons149.workers.dev/api';

  function normalizeApiBase(s) {
    if (!s) return '';
    return s.replace(/\/+$/, '');
  }

  let selected=DEFAULT_API;
  if(API_Q) {
    try {
      const candidate=new URL(API_Q),configured=new URL(DEFAULT_API);
      if(candidate.origin===configured.origin&&normalizeApiBase(candidate.pathname)===configured.pathname&&
        !candidate.username&&!candidate.password&&!candidate.search&&!candidate.hash)selected=candidate.href;
    } catch { /* Invalid or unapproved overrides never receive essay text. */ }
  }
  const API_BASE = normalizeApiBase(selected);

  window.EC = Object.assign(window.EC || {}, {
    DEV,
    API_BASE
  });

  console.log('[EC config] DEV =', DEV, 'API_BASE =', API_BASE || '(mock)');
})();
