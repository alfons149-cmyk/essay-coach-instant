// i18n.js

(window.__LOAD_ORDER ||= []).push('i18n');

(function(){
  // --- Locale detection (query param first, then path) ---
  const qs   = new URLSearchParams(location.search);
  const qp   = (qs.get('lang') || '').toLowerCase();
  const path = (location.pathname || '').toLowerCase();

  // Normalize query param like "en-US" -> "en", "es-ES" -> "es"
  const qpBase = qp.split('-')[0];
  const qpLang = (qpBase === 'es' || qpBase === 'en') ? qpBase : '';

  // Strict path check: path segment boundary for "/es" only
  const pathLang = /(^|\/)es(\/|$)/.test(path) ? 'es' : 'en';

  window.LOCALE = qpLang || pathLang;
  document.documentElement.lang = window.LOCALE;

  // Restore session (and auto-expire trials)
  try{
    const raw = localStorage.getItem('ec_session');
    if (raw) {
      const s = JSON.parse(raw);
      if (s && typeof s === 'object') window.SESSION = { ...(window.SESSION || {}), ...s };
    }
    if (window.SESSION?.status === 'trial' && window.SESSION.trialEnd && Date.now() > Number(window.SESSION.trialEnd)) {
      window.SESSION = { status:'inactive', email:null, token:null, trialStart:null, trialEnd:null };
      localStorage.removeItem('ec_session');
    }
  }catch(_){}

  // i18n apply helper
  window.applyI18n = function(dict){
  window._i18nDict = dict || {};
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    const val = key.split('.').reduce((o,k)=>o && o[k], dict);
    if (typeof val === 'string') el.textContent = val;
  });
};
})(); // ← close the IIFE


  // i18n translate helper
  window.t = function(path, fallback){
    try{
      const d = window._i18nDict || {};
      const v = path.split('.').reduce((o,k)=>o && o[k], d);
      return (typeof v === 'string' && v) ? v : (fallback || path);
    }catch(e){ return fallback || path; }
  };

  // i18n loader (with fallback to EN)
  window.loadDict = async function(lang){
    const base = (window.EC && window.EC.BASE_PATH) || "";
    const candidates = [
      `${base}/assets/i18n/${lang}.json`,
      `${base}/i18n/${lang}.json`,          // older path
      `${base}/${lang}/i18n/${lang}.json`   // extra safety
    ];
    const tryFetch = async (url) => {
      try{
        const res = await fetch(url, { cache:'no-store' });
        if(res.ok) return await res.json();
      }catch(_){}
      return null;
    };
    let dict = null;
    for(const u of candidates){ dict = await tryFetch(u); if(dict) break; }
    if(!dict && lang!=='en'){ dict = await tryFetch(`${base}/assets/i18n/en.json`) || {}; }
    return dict || {};
  };
})();


