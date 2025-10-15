// =====================
// /js/app.js (clean)
// =====================

// 1) Guard against double loads (keeps wiring stable)
if (window.__EC_APP_LOADED) {
  console.warn('app.js loaded twice; skipping duplicate');
  throw new Error('Duplicate app.js');
}
window.__EC_APP_LOADED = true;

// 2) Helpful early error logging
window.addEventListener('error',  e => console.error('[BOOT ERROR]', e.filename, e.lineno + ':' + e.colno, e.message));
window.addEventListener('unhandledrejection', e => console.error('[BOOT REJECTION]', e.reason));

// 3) Static imports keep order: i18n → config → analyzer
import './i18n.js';
import './config.js';
import './ec_sentences.js';

// 4) Tiny helpers
const $ = (id)=> document.getElementById(id);
const ready = (fn)=> (document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', fn, { once:true })
  : fn());

// 5) After config is loaded, honor ?api= override (even if config froze a default)
{
  const qs = new URLSearchParams(location.search);
  const api = qs.get('api');
  if (api) {
    const base = String(api).replace(/\/+$/, '');
    // replace with a fresh object so we can override a frozen one
    window.EC_CONFIG = { ...(window.EC_CONFIG || {}), API_BASE: base + '/api' };
    console.log('[APP] API override →', window.EC_CONFIG.API_BASE);
  }
}

// 6) Decide mock vs real (DEV no longer forces mock)
const qs = new URLSearchParams(location.search);
const DEV  = !!(window.EC && window.EC.DEV_MODE);
const API  = (window.EC_CONFIG && window.EC_CONFIG.API_BASE) || '';
const PLACEHOLDER = /YOUR-LIVE-API/i.test(API) || !API;   // treat missing as placeholder
let   FORCE_MOCK  = qs.has('mock') || PLACEHOLDER;        // only mock if explicit or placeholder
if (qs.has('nomock')) FORCE_MOCK = false;

console.log('[BOOT] DEV:', DEV, 'API:', API, 'PLACEHOLDER:', PLACEHOLDER, 'FORCE_MOCK:', FORCE_MOCK);

// 7) i18n loader (runs on DOM ready)
ready(async () => {
  const lang = (window.LOCALE || 'en').toLowerCase();
  const url  = `/essay-coach-instant/assets/i18n/${lang}.json?v=live1`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const dict = await res.json();
    (window.applyI18n || (()=>{}))(dict);
  } catch (e) {
    console.warn('[i18n] load failed:', e);
    if (lang !== 'en') {
      try {
        const res2 = await fetch('/essay-coach-instant/assets/i18n/en.json?v=live1', { cache:'no-store' });
        if (res2.ok) (window.applyI18n || (()=>{}))(await res2.json());
      } catch {}
    }
  }
});

// 8) Sentence analyzer hook (safe if analyzer is missing)
function updateSentenceAnalysis(text){
  const box = $('sentenceAnalysis'); if (!box) return;
  try {
    const html = window.EC_Sentences?.analyzeToHTML?.(text || '', { locale: (window.LOCALE||'en') }) || '';
    box.innerHTML = html;
  } catch { box.innerHTML = ''; }
}

// 9) Corrector (mock or real). Also expose globally for fail-safe delegator.
async function correctEssay(){
  console.log('[EC] Correct clicked');

  const essay = $('essayIn')?.value?.trim() || '';
  const lvl   = $('levelSelect')?.value || 'C1';
  const typ   = $('typeSelect')?.value || 'essay';
  if (!essay) { alert('Paste your essay first.'); return; }

  if (FORCE_MOCK) {
    console.log('[EC] Mocking (reason):', {
      mockFlag: qs.has('mock'),
      placeholder: PLACEHOLDER,
      noApi: !API
    });
    const mock = `
      <h3>Mock correction (${lvl.toUpperCase()} – ${typ})</h3>
      <ul>
        <li><strong>Grammar:</strong> Mostly accurate; watch subject–verb agreement.</li>
        <li><strong>Lexis:</strong> Good range; avoid repetition.</li>
        <li><strong>Organisation:</strong> Clear paragraphing; improve transitions.</li>
        <li><strong>Task fulfilment:</strong> Covers all points; tighten conclusion.</li>
      </ul>
      <p><em>(DEV mock. Use <code>?api=https://YOUR-HTTPS-API</code> or run the frontend on http locally.)</em></p>
    `;
    $('essayOut').innerHTML = mock;
    updateSentenceAnalysis(essay);
    return;
  }

  try {
    console.log('[EC] POST →', `${API}/correct`);
    const r = await fetch(`${API}/correct`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
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
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();

    const html = (typeof data === 'string') ? data
               : (typeof data.html === 'string') ? data.html
               : (typeof data.output === 'string') ? data.output
               : '';
    const safe = window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
    $('essayOut').innerHTML = safe || '<p>(No response)</p>';
    updateSentenceAnalysis(essay);
  } catch (e) {
    console.error('[EC] Error:', e);
    $('essayOut').innerHTML = `<p style="color:#b91c1c">Error: ${String(e.message||e)}</p>`;
  }
}
window.__ec_correct = correctEssay; // for fail-safe delegate

// 10) Fail-safe global click delegator (works even if something wires late)
document.addEventListener('click', (ev) => {
  const t = ev.target?.closest?.('button, a');
  if (!t) return;
  if (t.id === 'btnCorrect') {
    ev.preventDefault();
    return (typeof window.__ec_correct === 'function')
      ? window.__ec_correct()
      : console.warn('[FAIL-SAFE] btnCorrect clicked before handler was ready');
  }
  if (t.id === 'btnClear') {
    ev.preventDefault();
    const ta = $('essayIn'); if (ta) ta.value = '';
    const out = $('essayOut'); if (out) out.innerHTML = '';
    updateSentenceAnalysis('');
  }
  if (t.id === 'btnPaste') {
    ev.preventDefault();
    navigator.clipboard.readText()
      .then(txt => {
        const ta = $('essayIn'); if (!ta) return;
        ta.value = txt || '';
        updateSentenceAnalysis(ta.value);
        ta.focus();
      })
      .catch(()=> alert('Clipboard permission needed. Paste with Ctrl/Cmd+V instead.'));
  }
  // Timer (simple)
  if (t.id === 'btnTimer') {
    ev.preventDefault();
    const btn = t;
    const running = btn.dataset.running === '1';
    if (!running){
      btn.dataset.running = '1';
      btn._start = Date.now();
      btn._tick = setInterval(()=>{
        const s = Math.floor((Date.now() - btn._start)/1000);
        const m = String(Math.floor(s/60)).padStart(2,'0');
        const ss = String(s%60).padStart(2,'0');
        btn.textContent = `⏱ ${m}:${ss}`;
      }, 500);
    } else {
      btn.dataset.running = '0';
      clearInterval(btn._tick);
      btn.textContent = (window._i18nDict?.buttons?.startTimer) || 'Start timer';
    }
  }
});

// 11) Minimal UI polish & input hooks
ready(() => {
  const out = $('essayOut');
  if (out && !out.style.minHeight) {
    out.style.minHeight = '160px';
    out.style.padding = '14px';
    out.style.border = '1px solid #e5e7eb';
    out.style.borderRadius = '12px';
    out.style.background = '#fff';
    out.style.marginTop = '8px';
  }
  $('essayIn')?.addEventListener('input', (e)=> updateSentenceAnalysis(e.target.value));
  console.log('[BOOT] UI wired');
});
