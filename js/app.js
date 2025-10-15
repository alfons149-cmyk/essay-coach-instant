if (window.__EC_APP_LOADED) { console.warn('app.js loaded twice; skipping duplicate'); throw new Error('Duplicate app.js'); }
window.__EC_APP_LOADED = true;


// ========= RESCUE app.js =========

// Force override from ?api= in case a stale config leaks through
{
  const qs = new URLSearchParams(location.search);
  const api = qs.get('api');
  if (api) {
    const base = String(api).replace(/\/+$/, '');
    window.EC_CONFIG = Object.assign({}, window.EC_CONFIG, { API_BASE: base + '/api' });
    console.log('[APP] API override →', window.EC_CONFIG.API_BASE);
  }
}

// Basic helpers
function $(id){ return document.getElementById(id); }
function ready(fn){ document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, {once:true}) : fn(); }
function putHTML(el, s){ if (el) el.innerHTML = s; }

// Show first script errors loudly
window.addEventListener('error', (e)=>{
  console.error('[BOOT ERROR]', e.filename, e.lineno+':'+e.colno, e.message);
});
window.addEventListener('unhandledrejection', (e)=>{
  console.error('[BOOT REJECTION]', e.reason);
});

// Load dependencies defensively
(async () => {
  try {
    await import('./i18n.js');
  } catch (e) {
    console.error('[LOAD] i18n.js failed:', e);
    // Minimum fallback so app still works
    window.LOCALE = window.LOCALE || 'en';
    window.applyI18n = window.applyI18n || function(){};
  }

  try {
    await import('./config.js');
  } catch (e) {
    console.error('[LOAD] config.js failed:', e);
    window.EC_CONFIG = window.EC_CONFIG || { API_BASE:'', REQUIRE_SUBSCRIPTION:false };
    window.EC = window.EC || {};
    window.EC.DEV_MODE = /\bdev=1\b/.test(location.search);
  }

  try {
    await import('./ec_sentences.js');
  } catch (e) {
    console.error('[LOAD] ec_sentences.js failed:', e);
    // Analyzer is optional; app can still run
  }

  // Context (decide mock vs real)
  const qs  = new URLSearchParams(location.search);
const DEV = !!(window.EC && window.EC.DEV_MODE);
let   API = (window.EC_CONFIG && window.EC_CONFIG.API_BASE) || '';

const PLACEHOLDER = /YOUR-LIVE-API/i.test(API) || !API;  // treat missing as placeholder
let   FORCE_MOCK  = qs.has('mock') || PLACEHOLDER;       // DEV no longer auto-mocks
if (qs.has('nomock')) FORCE_MOCK = false;                // manual override

console.log('[BOOT] DEV:', DEV, 'API:', API, 'PLACEHOLDER:', PLACEHOLDER, 'FORCE_MOCK:', FORCE_MOCK);


  // Load i18n dict (root-relative so /es/ works)
  ready(async () => {
    const lang = (window.LOCALE || 'en').toLowerCase();
    const url  = `/essay-coach-instant/assets/i18n/${lang}.json?v=fix1`;
    try {
      const r = await fetch(url, { cache:'no-store' });
      if (!r.ok) throw new Error('HTTP '+r.status);
      window.applyI18n && window.applyI18n(await r.json());
    } catch (e) {
      console.warn('[i18n] load failed:', e);
    }
  });

  // Hook sentence analyzer (if present)
  function updateSentenceAnalysis(text){
    const box = $('sentenceAnalysis'); if (!box) return;
    try {
      const html = window.EC_Sentences?.analyzeToHTML?.(text || '', { locale: (window.LOCALE||'en') }) || '';
      box.innerHTML = html;
    } catch {
      box.innerHTML = '';
    }
  }

  // Corrector (mock or real)
  async function correctEssay(){
    console.log('[EC] Correct clicked');
    const essay = $('essayIn')?.value?.trim() || '';
    const lvl   = $('levelSelect')?.value || 'C1';
    const typ   = $('typeSelect')?.value || 'essay';
    if (!essay) { alert('Paste your essay first.'); return; }

    if (FORCE_MOCK) {
      console.log('[EC] Showing DEV mock');
      const mock = `
        <h3>Mock correction (${lvl.toUpperCase()} – ${typ})</h3>
        <ul>
          <li><strong>Grammar:</strong> Mostly accurate; watch subject–verb agreement.</li>
          <li><strong>Lexis:</strong> Good range; avoid repetition.</li>
          <li><strong>Organisation:</strong> Clear paragraphing; improve transitions.</li>
          <li><strong>Task fulfilment:</strong> Covers all points; tighten conclusion.</li>
        </ul>
        <p><em>(DEV mock. Set <code>?api=http://127.0.0.1:8888</code> or your live API.)</em></p>
      `;
      putHTML($('essayOut'), mock);
      updateSentenceAnalysis(essay);
      return;
    }

    try {
      console.log('[EC] POST to', `${API}/correct`);
      const r = await fetch(`${API}/correct`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          level: lvl,
          type: typ,
          options: {
            formal: $('tgFormal')?.checked,
            coachNotes: $('tgCoachNotes')?.checked,
            rubric: $('tgRubric')?.checked
          },
          text: essay
        })
      });
      if (!r.ok) throw new Error('HTTP '+r.status);
      const data = await r.json();
      const safe = window.DOMPurify ? window.DOMPurify.sanitize(data.html) : data.html;
      putHTML($('essayOut'), safe || '<p>(No response)</p>');
      updateSentenceAnalysis(essay);
    } catch (e) {
      console.error('[EC] Error:', e);
      putHTML($('essayOut'), `<p style="color:#b91c1c">Error: ${String(e.message||e)}</p>`);
    }
  }

  // Wire buttons explicitly after DOM is parsed
  ready(() => {
    // make output box visible if your CSS is minimal
    const out = $('essayOut');
    if (out && !out.style.minHeight) {
      out.style.minHeight = '160px';
      out.style.padding = '14px';
      out.style.border = '1px solid #e5e7eb';
      out.style.borderRadius = '12px';
      out.style.background = '#fff';
      out.style.marginTop = '8px';
    }

    $('btnCorrect')?.addEventListener('click', (e)=>{ e.preventDefault(); correctEssay(); });
    $('btnClear')?.addEventListener('click', (e)=>{ e.preventDefault(); const ta=$('essayIn'); if(ta){ ta.value=''; updateSentenceAnalysis(''); } if(out){ out.innerHTML=''; } });
    $('essayIn')?.addEventListener('input', (e)=> updateSentenceAnalysis(e.target.value));

    console.log('[BOOT] UI wired');
  });
})();




