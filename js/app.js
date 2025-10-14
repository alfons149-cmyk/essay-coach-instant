// ===== Imports (order matters) =====
import './i18n.js';
import './config.js';
import './ec_sentences.js';

// ===== Single context (no redeclarations) =====
const ECX = (globalThis.__ECX ||= (() => {
  const qs = new URLSearchParams(location.search);
  const DEV = !!(window.EC && window.EC.DEV_MODE);            // ?dev=1 in config.js
  const API = (window.EC_CONFIG && window.EC_CONFIG.API_BASE) || '';
  const PLACEHOLDER = /YOUR-LIVE-API/i.test(API);
  const FORCE_MOCK = DEV || PLACEHOLDER || qs.has('mock');     // allow &mock=1
  return { DEV, API, PLACEHOLDER, FORCE_MOCK };
})());

console.log('[ECX]', ECX);

// ===== Tiny helpers =====
function $(id){ return document.getElementById(id); }
function putHTML(el, s){ if (el) el.innerHTML = s; }
function ready(fn){ document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once:true }) : fn(); }

// ===== i18n loader (root-relative so /es/ works) =====
ready(async () => {
  const lang = (window.LOCALE || 'en').toLowerCase();
  const url  = `/essay-coach-instant/assets/i18n/${lang}.json?v=dev6`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    window.applyI18n(await res.json());
  } catch (err) {
    console.error('i18n load failed:', err);
    if (lang !== 'en') {
      try {
        const f = await fetch('/essay-coach-instant/assets/i18n/en.json?v=dev6', { cache: 'no-store' });
        if (f.ok) window.applyI18n(await f.json());
      } catch {}
    }
  }
});

// ===== Sentence analysis hook (safe if library present) =====
function updateSentenceAnalysis(text){
  const box = $('sentenceAnalysis'); if (!box) return;
  try {
    box.innerHTML = text ? (window.EC_Sentences?.analyzeToHTML?.(text, { locale: (window.LOCALE||'en') }) || "") : "";
  } catch {
    box.innerHTML = "";
  }
}

// ===== Corrector (DEV mock or real API) =====
async function correctEssay() {
  console.log('[EC] Correct clicked');
  const essay = $('essayIn')?.value?.trim() || '';
  const lvl   = $('levelSelect')?.value || 'C1';
  const typ   = $('typeSelect')?.value || 'essay';

  if (!essay) { alert('Paste your essay first.'); return; }

  if (ECX.FORCE_MOCK) {
    console.log('[EC] Showing DEV mock');
    const mock = `
      <h3>Mock correction (${lvl.toUpperCase()} – ${typ})</h3>
      <ul>
        <li><strong>Grammar:</strong> Mostly accurate; watch subject–verb agreement.</li>
        <li><strong>Lexis:</strong> Good range; avoid repetition.</li>
        <li><strong>Organisation:</strong> Clear paragraphing; improve transitions.</li>
        <li><strong>Task fulfilment:</strong> Covers all points; tighten conclusion.</li>
      </ul>
      <p><em>(DEV mock. Set <code>?api=http://127.0.0.1:8888</code> or your live API to call the server.)</em></p>
    `;
    putHTML($('essayOut'), mock);
    updateSentenceAnalysis(essay);
    return;
  }

  try {
    console.log('[EC] POST to', `${ECX.API}/correct`);
    const res = await fetch(`${ECX.API}/correct`, {
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
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const safe = (window.DOMPurify ? window.DOMPurify.sanitize(data.html) : data.html);
    putHTML($('essayOut'), safe || '<p>(No response)</p>');
    updateSentenceAnalysis(essay);
  } catch (e) {
    console.error('[EC] Correct error:', e);
    putHTML($('essayOut'), `<p style="color:#b91c1c">Error: ${String(e.message||e)}</p>`);
  }
}

// ===== Basic undo for #essayIn =====
const Undo = (() => {
  const stack = []; const MAX = 50;
  return {
    push(v){ if (!stack.length || stack[stack.length-1] !== v) { stack.push(v); if (stack.length>MAX) stack.shift(); } },
    pop(){ if (stack.length>1) { stack.pop(); return stack[stack.length-1]; } return stack[0] || ''; },
    size(){ return stack.length; }
  };
})();

// ===== Wire UI once DOM is ready =====
ready(() => {
  // visible output box (if your CSS doesn’t already style it)
  const out = $('essayOut');
  if (out && !out.style.minHeight) {
    out.style.minHeight = '160px';
    out.style.padding = '14px';
    out.style.border = '1px solid #e5e7eb';
    out.style.borderRadius = '12px';
    out.style.background = '#fff';
    out.style.marginTop = '8px';
  }

  const ta = $('essayIn');
  if (ta) {
    Undo.push(ta.value || '');
    ta.addEventListener('input', () => Undo.push(ta.value || ''));
  }

  $('btnCorrect')?.addEventListener('click', (e)=>{ e.preventDefault(); correctEssay(); });
  $('btnUndo')?.addEventListener('click', (e)=>{
    e.preventDefault();
    if (!ta) return;
    const v = Undo.pop();
    ta.value = v;
    ta.dispatchEvent(new Event('input'));
  });
  $('btnClear')?.addEventListener('click', (e)=>{
    e.preventDefault();
    if (ta){ ta.value = ''; ta.dispatchEvent(new Event('input')); }
    if (out){ out.innerHTML = ''; }
  });
  $('btnPaste')?.addEventListener('click', async (e)=>{
    e.preventDefault();
    try {
      const txt = await navigator.clipboard.readText();
      if (ta){ ta.value = txt; ta.dispatchEvent(new Event('input')); ta.focus(); }
    } catch { alert('Clipboard permission needed. Use Ctrl/Cmd+V.'); }
  });

  // live sentence analysis while typing
  ta?.addEventListener('input', () => updateSentenceAnalysis(ta.value));

  console.log('[EC] UI wired');
});







