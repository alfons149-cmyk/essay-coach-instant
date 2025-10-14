import './i18n.js';
import './config.js';
import './ec_sentences.js';

// ---- Singleton context (won’t redeclare if run twice) ----
const ECX = (globalThis.__ECX ||= (() => {
  const qs = new URLSearchParams(location.search);
  const DEV = !!(window.EC && window.EC.DEV_MODE);                  // set by config.js via ?dev=1
  const API = (window.EC_CONFIG && window.EC_CONFIG.API_BASE) || '';
  const PLACEHOLDER = /YOUR-LIVE-API/i.test(API);                    // still the sample URL?
  const FORCE_MOCK = DEV || PLACEHOLDER || qs.has('mock');           // allow &mock=1
  return { DEV, API, PLACEHOLDER, FORCE_MOCK };
})());

console.log('[ECX]', ECX);  // e.g., {DEV:true, API:"https://…/api", …}

// ---------- Corrector wiring ----------
function $(id){ return document.getElementById(id); }
function putHTML(el, s){ if (el) el.innerHTML = s; }

async function correctEssay() {
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
      <p><em>(DEV mock. Set <code>?api=http://127.0.0.1:8888</code> or your live API to call the server.)</em></p>
    `;
    putHTML($('essayOut'), mock);
    return;
  }

  // ---- Real API call ----
  try {
    console.log('[EC] POST to', `${API}/correct`);
    const res = await fetch(`${API}/correct`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
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
  } catch (e) {
    console.error('[EC] Correct error:', e);
    putHTML($('essayOut'), `<p style="color:#b91c1c">Error: ${String(e.message||e)}</p>`);
  }
}

// Global click handler (works even if DOM not fully ready)
document.addEventListener('click', (ev)=>{
  if (ev.target && ev.target.id === 'btnCorrect') correctEssay();
});


// --- load dictionary based on LOCALE ---
(async () => {
  const lang = (window.LOCALE || 'en').toLowerCase();
  const url  = `/essay-coach-instant/assets/i18n/${lang}.json?v=dev1`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dict = await res.json();
    window.applyI18n(dict);
  } catch (err) {
    console.error('i18n load failed:', err);
    // Fallback to English (root-relative so it works under /es/)
    if (lang !== 'en') {
      try {
        const res2 = await fetch('/essay-coach-instant/assets/i18n/en.json?v=dev1', { cache: 'no-store' });
        if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
        const dict2 = await res2.json();
        window.applyI18n(dict2);
      } catch (e2) {
        console.error('Fallback i18n load failed:', e2);
      }
    }
  }
})();

// ==============================
// app.js (final, matched to index.html)
// ==============================
(window.__LOAD_ORDER ||= []).push('app');
console.log('LOAD_ORDER →', window.__LOAD_ORDER);


if (!window.LOCALE)    console.error('i18n.js not loaded before app.js');
if (!window.EC_CONFIG) console.error('config.js not loaded before app.js');
if (!window.EC?.Sentences && !window.EC_SENTENCES) {
  console.error('ec_sentences.js not loaded before app.js');
}

// --- Safe globals (in case config.js didn't load) ---
window.EC_CONFIG = window.EC_CONFIG || {
  REQUIRE_SUBSCRIPTION: false,
  SHOW_TRIAL: true,
  TRIAL_DAYS: 2,
  API_BASE: ""
};
window.SESSION = window.SESSION || {
  status: 'inactive',
  email: null,
  token: null,
  trialStart: null,
  trialEnd: null,
  timerStart: null // persist timer between reloads
};
window.QUOTA = window.QUOTA || {
  used: 0, cap: (window.EC_CONFIG.QUOTA_CAP || 20)
};
window.EC = window.EC || {}; // if you rely on EC.BASE_PATH elsewhere
// --- config shortcuts ---
const DEV = !!(window.EC && window.EC.DEV_MODE);
const API = (window.EC_CONFIG && window.EC_CONFIG.API_BASE) || '';

// --- Persistence helpers for session/quota ---
function persistSession(){ try{ localStorage.setItem('ec_session', JSON.stringify(window.SESSION)); }catch(_){} }
function persistQuota(){ try{ localStorage.setItem('ec_quota', JSON.stringify(window.QUOTA)); }catch(_){} }

// Restore persisted session/quota ASAP
(function restoreQuotaSession(){
  try{
    const q = JSON.parse(localStorage.getItem('ec_quota')||'null'); if(q) window.QUOTA = {...window.QUOTA, ...q};
    const s = JSON.parse(localStorage.getItem('ec_session')||'null'); if(s) window.SESSION = {...window.SESSION, ...s};
  }catch(_){}
})();

// --- Globals we read throughout (aliased once) ---
const LOCALE = window.LOCALE || document.documentElement.lang || 'en';
const DEV_MODE = !!(window.EC && window.EC.DEV_MODE);

// --- Light fallbacks for i18n/utilities (won't overwrite real ones if present) ---
const t = (window.t) || ((k, def) => (def != null ? def : k));
const loadDict = window.loadDict || (async () => ({}));
const applyI18n = window.applyI18n || (() => {});
const DOMPurifySafe = (window.DOMPurify && window.DOMPurify.sanitize) ? (html, opts)=>window.DOMPurify.sanitize(html, opts) : null;

// --- Dev banner (no session mutation) + diagnostics ---
if (DEV_MODE) {
  console.warn('⚠️ Dev Mode enabled — subscription checks bypassed');

  document.addEventListener('DOMContentLoaded', () => {
    const basePath   = (window.EC && window.EC.BASE_PATH) || '(none)';
    const apiBase    = (window.EC_CONFIG && window.EC_CONFIG.API_BASE) || '(empty)';
    const sessStatus = (window.SESSION && window.SESSION.status) || 'inactive';

    const dev = document.createElement('div');
    dev.id = 'ecDevBanner';
    dev.style.cssText = [
      'position:fixed','top:8px','right:8px','background:#111827','color:#fff',
      'font:12px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial, sans-serif',
      'padding:8px 10px','border-radius:8px','opacity:.95','z-index:9999',
      'box-shadow:0 4px 14px rgba(0,0,0,.25)','max-width:52ch','cursor:default'
    ].join(';');

    dev.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <strong>DEV MODE</strong>
        <span style="opacity:.85">— simulated correction for demo purposes</span>
      </div>
      <div style="margin-top:6px;opacity:.95">
        <div><span style="opacity:.7">EC.BASE_PATH:</span> <code style="font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">${escapeHtml(basePath)}</code></div>
        <div><span style="opacity:.7">API_BASE:</span> <code style="font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">${escapeHtml(apiBase)}</code></div>
        <div><span style="opacity:.7">SESSION.status:</span> <code style="font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">${escapeHtml(sessStatus)}</code></div>
        <div><span style="opacity:.7">LOCALE:</span> <code style="font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">${escapeHtml(LOCALE)}</code></div>
      </div>
    `;

    document.body.appendChild(dev);
  });

  // Optional: collapse/expand on click (scoped to DEV only)
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('#ecDevBanner');
    if (!el) return;
    const collapsed = el.getAttribute('data-collapsed') === '1';
    el.setAttribute('data-collapsed', collapsed ? '0' : '1');
    const details =
      el.querySelector(':scope > div:nth-child(2)') ||
      (el.firstElementChild && el.firstElementChild.nextElementSibling);
    if (details) details.style.display = collapsed ? '' : 'none';
  });
}

// ===== Helpers =====
const $ = s=>document.querySelector(s);
function escapeHtml(s){return (s||'').replace(/[&<>]/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[m]))}

// Text helpers
function stripTags(html=""){ const d=document.createElement('div'); d.innerHTML=html; return d.textContent || d.innerText || ''; }
function wcOf(text){ return (stripTags(text).match(/\b[\w’'-]+\b/g)||[]).length; }
function wordBand(level){
  if(level==='B2') return {min:140, max:190};
  if(level==='C2') return {min:240, max:280};
  return {min:220, max:260}; // C1
}
function ensureKPI(){
  let host = document.querySelector('#corrector .kpi');
  if (host) return host;
  host = document.createElement('div'); host.className='kpi';
  document.getElementById('corrector')?.prepend(host);
  return host;
}
function showWordcount(text, level){
  const host = ensureKPI();
  host.querySelectorAll('.pill[data-wc]').forEach(n=>n.remove());
  const {min,max} = wordBand(level);
  const wc = wcOf(text);
  const pill = document.createElement('span');
  pill.className = 'pill'; pill.setAttribute('data-wc','1');
  pill.textContent = `Words: ${wc} (${min}–${max}${wc<min?' ↓':wc>max?' ↑':' ✓'})`;
  host.prepend(pill);
}
function bandBadge(ok){ return ok ? 'badge ok' : 'badge warn'; }
function sevClass(sev){ return sev==='major' ? 'issue major' : 'issue'; }

// --- Task helpers ---
function readTask(){
  const level  = document.getElementById('levelSelect')?.value || 'C1';
  const type   = document.getElementById('typeSelect')?.value || 'essay';
  const prompt = document.getElementById('taskPrompt')?.value || '';
  const bullets = (document.getElementById('taskBullets')?.value || '')
    .split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const selectedBullets = (document.getElementById('taskSelected')?.value || '')
    .split(',').map(s=>s.trim()).filter(Boolean);
  const sourceA = document.getElementById('taskSourceA')?.value || '';
  const sourceB = document.getElementById('taskSourceB')?.value || '';
  return { level, type, prompt, bullets, selectedBullets, sourceA, sourceB };
}

function renderTaskFields(){
  const level = document.getElementById('levelSelect')?.value || 'C1';
  const type  = document.getElementById('typeSelect')?.value || 'essay';
  const bulletsArea = document.getElementById('taskBulletsArea');
  const sourcesArea = document.getElementById('taskSourcesArea');

  if (bulletsArea) bulletsArea.style.display =
    (type==='essay' && (level==='B2' || level==='C1')) ? '' : 'none';

  if (sourcesArea) sourcesArea.style.display =
    (type==='essay' && level==='C2') ? '' : 'none';
}

// --- Simple keyword hit for bullet coverage ---
function keywordHit(text, kw){
  const esc = s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const k = (kw||'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').trim();
  if(!k) return false;
  const parts = k.split(/\s+/).filter(Boolean).slice(0,3);
  return parts.some(p => new RegExp(`\\b${esc(p)}\\b`, 'i').test(text));
}

// --- Part 2 / genre checks (and Part 1 hints) ---
function renderPart2Rubric(text, level, type, task){
  const box = document.getElementById('part2Rubric'); if(!box) return;
  const ttxt = (text||'').trim();

  // Genre heuristics
  const lines = ttxt.split(/\n+/);
  const hasHeadings = /^(introduction|background|findings|analysis|recommendations|conclusion)\b/i.test(ttxt)
                      || lines.some(l=>/^[A-Z][A-Z\s]{3,}$/.test(l.trim()));
  const hasGreeting = /\b(dear (sir|madam|editor|mr|mrs|ms|[A-Z][a-z]+)[,])/.test(ttxt);
  const hasSignoff  = /\b(yours faithfully|yours sincerely|best regards|kind regards)[,]?\b/i.test(ttxt);
  const hasRecs     = /\b(recommend|should|ought to|we propose|i suggest)\b/i.test(ttxt);
  const hasProps    = /\b(aim|background|budget|timeline|benefits|resources|logistics)\b/i.test(ttxt);
  const hasReviewV  = /\b(i recommend|worth|lacked|enjoyed|compelling|well[- ]paced|poorly|overlong|performances?)\b/i.test(ttxt);
  const hasTitle    = /^[^\n]{3,100}\n/.test(text);

  const items = [];
  if (type==='report'){
    items.push([hasHeadings, 'Sectioning (Introduction/Findings/Recommendations)']);
    items.push([hasRecs,     'Clear, objective recommendations']);
    items.push([!hasGreeting && !hasSignoff, 'No letter-like greeting/closing']);
  } else if (type==='proposal'){
    items.push([hasHeadings || hasProps, 'Sections (Aim/Benefits/Budget/Timeline)']);
    items.push([hasRecs,                 'Persuasive recommendations with rationale']);
    items.push([!hasGreeting && !hasSignoff, 'Appropriate formal register (no letter closings)']);
  } else if (type==='review'){
    items.push([hasTitle || hasReviewV, 'Title or reviewer stance visible']);
    items.push([hasReviewV,            'Evaluation language (what works/what doesn’t)']);
    items.push([!hasGreeting,          'No letter greetings']);
  } else if (type==='letter'){
    items.push([hasGreeting, 'Correct salutation (Dear …)']);
    items.push([hasSignoff,  'Appropriate sign-off (Yours sincerely/faithfully)']);
    items.push([!hasHeadings,'No report-style headings']);
  } else {
    // Essay (Part 1)
    items.push([true, 'Discursive structure (intro–body–conclusion)']);

    if (level==='B2' && (task?.bullets||[]).length>=2){
      const hits = task.bullets.filter(b=>keywordHit(ttxt,b)).length;
      items.push([hits>=2, 'Covers the two given ideas']);
      items.push([hits>=3, 'Includes one extra idea of your own']);
    }
    if (level==='C1' && (task?.bullets||[]).length>=3){
      const cnt = task.bullets.map(b=>keywordHit(ttxt,b)).filter(Boolean).length;
      items.push([cnt>=2, 'Develops two of the three bullet points']);
    }
    if (level==='C2'){
      const hasA = !!(task?.sourceA?.trim());
      const hasB = !!(task?.sourceB?.trim());
      items.push([hasA && hasB, 'Two source texts provided (needed for C2 Part 1)']);
    }
  }

  box.innerHTML = `<div class="checklist">` +
    items.map(([ok,label])=>`<span class="check ${ok?'ok':''}">${escapeHtml(label)}</span>`).join('') +
  `</div>`;
}

// ===== Account UI =====
function renderAccountMenu(){
  const el = document.getElementById('accountMenu'); if(!el) return;
  const s = window.SESSION.status;
  const acct = escapeHtml(window.SESSION.email || t('account.account','Account'));
  if(s==='active'){
    el.innerHTML = `<span class="pill">${acct}</span>
      <button id="btnManagePlan" class="btn-ghost">${t('account.manage','Manage plan')}</button>
      <button id="btnSignOut" class="btn-ghost">${t('account.signOut','Sign out')}</button>`;
  } else if(s==='trial'){
    el.innerHTML = `<span class="pill">${t('account.trialActive','Trial active')}</span>
      <button id="btnSubscribe" class="btn-primary">${t('account.subscribe','Subscribe')}</button>
      <button id="btnSignOut" class="btn-ghost">${t('account.signOut','Sign out')}</button>`;
  } else {
    el.innerHTML = `<button id="btnLogin" class="btn-primary">${t('account.login','Log in')}</button>
      <button id="btnSignUp" class="btn-ghost">${t('account.signUp','Sign up')}</button>`;
  }
}
function canUseCorrector(){
  return DEV_MODE || !!(window.SESSION && (window.SESSION.status === 'active' || window.SESSION.status === 'trial'));
}
function refreshGates(){
  const paywall = document.getElementById('paywall');
  const cfg = window.EC_CONFIG || {};
  if (paywall) {
    if (!cfg.REQUIRE_SUBSCRIPTION || canUseCorrector()) {
      paywall.classList.add('hidden');
    } else {
      paywall.classList.remove('hidden');
    }
  }
  renderAccountMenu();
}

// ===== Trial helpers =====
function msLeftTrial(){
  return (window.SESSION.status==='trial' && window.SESSION.trialEnd)
    ? Math.max(0, Number(window.SESSION.trialEnd)-Date.now())
    : null;
}
function showQuota(){
  const qp=document.getElementById('quotaPill'); if(!qp) return;
  const ms = msLeftTrial();
  if(ms!==null){
    const day=24*60*60*1000;
    if(ms<day){
      const h=Math.ceil(ms/(60*60*1000));
      qp.textContent=`${LOCALE==='es'?'Prueba':'Trial'}: ${h} ${LOCALE==='es'?(h===1?'hora':'horas'):(h===1?'hour':'hours')} ${t('misc.left','left')}`;
    } else {
      const d=Math.ceil(ms/day);
      qp.textContent=`${LOCALE==='es'?'Prueba':'Trial'}: ${d} ${LOCALE==='es'?(d===1?'día':'días'):(d===1?'day':'days')} ${t('misc.left','left')}`;
    }
    return;
  }
  qp.textContent = `${window.QUOTA.used}/${window.QUOTA.cap}`;
}
function updateTrialBanner(){
  const box=document.getElementById('trialBanner'); const msg=document.getElementById('trialBannerMsg'); if(!box||!msg) return;
  const ms=msLeftTrial(); const day=24*60*60*1000;
  if(ms!==null && ms>0 && ms<=day){
    const h=Math.ceil(ms/(60*60*1000)); const unit=LOCALE==='es'?(h===1?'hora':'horas'):(h===1?'hour':'hours');
    msg.textContent = (LOCALE==='es') ? `Tu prueba termina en ${h} ${unit}.` : `Your trial ends in ${h} ${unit}.`;
    box.classList.remove('hidden');
  } else { box.classList.add('hidden'); msg.textContent=''; }
}

// ===== Content (HTML fallback for punctuation guide) =====
const PUNCT_GUIDE = "<p><strong>Why should you learn about punctuation?</strong><br> Most native speakers don't use punctuation correctly themselves. So, what's the point of learning this? The answer is simple: this is Cambridge. Using punctuation correctly and effectively shows your level and adds value to your composition.</p><ul><li><strong>Full stop (.)</strong> — Use at the end of sentences.</li><li><strong>Comma (,)</strong> — Separate items in a list, clauses, or after connectors.</li><li><strong>Semicolon (;)</strong> — Link closely related independent clauses.</li><li><strong>Colon (:)</strong> — Introduce a list, explanation, or example.</li><li><strong>Dash (—)</strong> — Add emphasis or mark off extra information.</li><li><strong>Apostrophe (’)</strong> — Show possession or form contractions.</li></ul>";

function renderPunctGuide(){
  const pg=document.getElementById('punctList'); if(!pg) return;
  let html=(window._i18nDict&&window._i18nDict.punct&&window._i18nDict.punct.guide)
    ? window._i18nDict.punct.guide : PUNCT_GUIDE;
  if(/&lt;|&gt;|&amp;/.test(html)){ const ta=document.createElement('textarea'); ta.innerHTML=html; html=ta.value; }
  pg.innerHTML=html;
}

// ===== Undo stack =====
const UNDO_LIMIT = 50;
const _undo = [];
function pushUndoSnapshot(){
  const box = document.getElementById('improvedBox');
  if(!box) return;
  const snap = { html: box.innerHTML, ts: Date.now() };
  _undo.push(snap);
  if(_undo.length > UNDO_LIMIT) _undo.shift();
  updateUndoUI();
}
function clearUndoStack(){ _undo.length = 0; updateUndoUI(); }
function updateUndoUI(){ const btn = document.getElementById('btnUndo'); if(btn) btn.disabled = _undo.length===0; }
function undoLastChange(){
  const box = document.getElementById('improvedBox');
  if(!box || _undo.length===0) return;
  const snap = _undo.pop();
  box.innerHTML = snap.html;
  const plain = box.textContent || '';
  updateSentenceAnalysis(plain);
  showWordcount(plain, (document.getElementById('levelSelect')?.value||'C1'));
  const tip = document.getElementById('hlTip'); if(tip) { tip.setAttribute('aria-hidden','true'); tip.style.display='none'; }
  updateUndoUI();
  saveDraft(); // persist after undo
}

// ===== AUTOSAVE =====
const AUTOSAVE_KEY = 'ec_autosave_v2';
let _saveTimer = null;
function saveDraft(){
  const improvedHTML = document.getElementById('improvedBox')?.innerHTML || '';
  const data = {
    essayIn: document.getElementById('essayIn')?.value || '',
    taskPrompt: document.getElementById('taskPrompt')?.value || '',
    taskBullets: document.getElementById('taskBullets')?.value || '',
    taskSelected: document.getElementById('taskSelected')?.value || '',
    taskSourceA: document.getElementById('taskSourceA')?.value || '',
    taskSourceB: document.getElementById('taskSourceB')?.value || '',
    level: document.getElementById('levelSelect')?.value || 'C1',
    type: document.getElementById('typeSelect')?.value || 'essay',
    improvedHTML
  };
  try{ localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data)); }catch(_){}
}
function saveDraftDebounced(){ clearTimeout(_saveTimer); _saveTimer=setTimeout(saveDraft, 200); }

function ensureImprovedBox(){
  let box = document.getElementById('improvedBox');
  const out = document.getElementById('essayOut');
  if (box) return box;
  if (!out) return null;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <h4 style="margin:12px 0 6px">${LOCALE==='es'?'Versión mejorada':'Improved version'}</h4>
    <div id="improvedBox" class="preview"></div>
  `;
  out.appendChild(wrapper);
  return document.getElementById('improvedBox');
}

function restoreDraft(){
  try{
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if(!raw) return;
    const d = JSON.parse(raw);

    if(d.level) document.getElementById('levelSelect').value = d.level;
    if(d.type)  document.getElementById('typeSelect').value  = d.type;
    renderTaskFields();

    if(d.taskPrompt)   document.getElementById('taskPrompt').value   = d.taskPrompt;
    if(d.taskBullets)  document.getElementById('taskBullets').value  = d.taskBullets;
    if(d.taskSelected) document.getElementById('taskSelected').value = d.taskSelected;
    if(d.taskSourceA)  document.getElementById('taskSourceA').value  = d.taskSourceA;
    if(d.taskSourceB)  document.getElementById('taskSourceB').value  = d.taskSourceB;

    if(d.essayIn){
      document.getElementById('essayIn').value = d.essayIn;
      updateSentenceAnalysis(d.essayIn);
    }

    if (d.improvedHTML) {
      const box = ensureImprovedBox();
      if (box) {
        box.innerHTML = d.improvedHTML;
        const plain = box.textContent || '';
        updateSentenceAnalysis(plain);
        showWordcount(plain, (document.getElementById('levelSelect')?.value||'C1'));
      }
    }
  }catch(_){}
}

// ===== Corrector =====
async function runCorrection(src){
  if(!canUseCorrector()) {
    throw new Error(t('misc.needSubscription','You need an active subscription to use the corrector.'));
  }

  const opts = {
    formal: document.getElementById('tgFormal')?.checked !== false,
    coachNotes: document.getElementById('tgCoachNotes')?.checked !== false,
    rubric: document.getElementById('tgRubric')?.checked !== false,
    level: (document.getElementById('levelSelect')?.value || 'C1'),
    type:  (document.getElementById('typeSelect')?.value  || 'essay'),
    locale: LOCALE
  };
  const task = readTask();

  if (DEV_MODE) {
    const improved = (LOCALE==='es'
      ? `<p>En mi opinión, las ciudades deberían invertir más en transporte público; además, reduciría la congestión y mejoraría la calidad del aire.</p><p>No obstante, es esencial evaluar el coste a largo plazo y la sostenibilidad del sistema.</p>`
      : `<p>In my view, cities should invest more in public transport; moreover, it would reduce congestion and improve air quality.</p><p>However, it is essential to evaluate long-term costs and the sustainability of the system.</p>`);
    const level = opts.level;
    const {min,max} = wordBand(level);
    const textWC = wcOf(improved);

    return {
      improved_text: improved,
      band_estimate: { level, band: (level==='C2'?4: (level==='C1'?3:2)), range:[(level==='C2'?4: (level==='C1'?3:2)), (level==='C2'?5:4)] },
      examiner_comment: (LOCALE==='es' ? 'Buen control y organización; matiza afirmaciones con hedging.' : 'Good control and organisation; hedge strong claims for nuance.'),
      task_alignment: (opts.level==='C2'
        ? { prompt_covered:true, c2_sources:{present: !!(task.sourceA && task.sourceB), summary_of_A:true, summary_of_B:true, integration:true, evaluation:true, verbatim_overlap_pct:2.5} }
        : { prompt_covered:true, bullets: (task.bullets||[]).slice(0,3).map((b,i)=>({
            text:b, covered:i<2, evidence:[ LOCALE==='es' ? `párrafo ${i+1}` : `paragraph ${i+1}` ]
          })) }),
      rubric: {
        content: { score: level==='C2'?5: (level==='C1'?4:3), evidence: [ LOCALE==='es'?'Responde a la tarea y aporta ejemplos':'Addresses the task with relevant examples' ] },
        communicative_achievement: { score: level==='C2'?5:4, evidence: [ LOCALE==='es'?'Registro formal sostenido':'Sustained formal register' ] },
        organisation: { score: level==='C2'?5:4, evidence: [ LOCALE==='es'?'Párrafos y conectores claros':'Clear paragraphing and discourse markers' ] },
        language: { score: level==='C2'?5:4, evidence: [ LOCALE==='es'?'Buen rango con pocos errores':'Good range with few slips' ] }
      },
      checks: {
        word_count: { actual: textWC, target_min: min, target_max: max, ok: textWC>=min && textWC<=max },
        register: { level: 'formal', violations: [
          { span:[0,15], type:'hedging', found:'In my view', suggest:(LOCALE==='es'?'En gran medida, parece que':'It seems that') }
        ] },
        linkers: { range: ['moreover','however'], variety_ok: true },
        sentence_types: { simple: 1, compound: 1, complex: 2, compound_complex: 0 },
        cohesion: { issues: [], repetitions:[{span:[20,55], linker:'moreover'}] },
        c2_synthesis: (level==='C2'
          ? { required: true, summary_ok: !!(task?.sourceA && task?.sourceB), evaluation_ok: !!(task?.sourceA && task?.sourceB) }
          : { required: false, summary_ok: null, evaluation_ok: null })
      },
      issues: [
        { span:[0,15], category:'lexis', severity:'minor', msg: LOCALE==='es'?'Podrías matizar con hedging':'Consider hedging for nuance', suggestion: LOCALE==='es'?'It seems / arguably':'It seems / arguably', replacement: LOCALE==='es'?'Parece que':'It seems that' }
      ],
      coach_notes: (LOCALE==='es'
        ? ['Añade una contraargumentación breve en el párrafo 2.', 'Sustituye intensificadores genéricos.']
        : ['Add a brief counter-argument in paragraph 2.', 'Replace generic intensifiers.'])
    };
  }

  const endpoint = (window.EC_CONFIG.API_BASE||'') + '/correct';
  const token = window.SESSION?.token;
  const res = await fetch(endpoint, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) },
    body: JSON.stringify({ text: src, options: opts, task })
  });

  if(!res.ok) throw new Error(t('misc.correctionFailed','Correction failed'));

  const data = await res.json();
  if (typeof data === 'string' || typeof data.output === 'string') return data;
  return data;
}

// ===== Highlight tooltip =====
function ensureHLTip(){
  let tip = document.getElementById('hlTip');
  if(!tip){
    tip = document.createElement('div');
    tip.id = 'hlTip';
    tip.className = 'hltip';
    tip.setAttribute('role','dialog');
    tip.setAttribute('aria-hidden','true');
    tip.setAttribute('aria-live','polite'); // announce changes
    tip.setAttribute('aria-label', LOCALE==='es'?'Sugerencias de corrección':'Correction suggestions');
    document.body.appendChild(tip);
  }
  return tip;
}
let _HL_ACTIVE_MARK = null;

function buildTipHTML(mark){
  const cat = mark.dataset.cat || (LOCALE==='es'?'Observación':'Issue');
  const msg = mark.dataset.msg || '';
  const sug = mark.dataset.sug || '';
  const rep = mark.dataset.rep || '';
  const multi = mark.dataset.multi ? JSON.parse(mark.dataset.multi) : null;

  let html = `<div class="tcat">${escapeHtml(cat)}</div>`;
  if(msg) html += `<div class="tmsg">${escapeHtml(msg)}</div>`;
  if(sug) html += `<div class="tsug"><em>${LOCALE==='es'?'Sugerencia:':'Suggestion:'}</em> ${escapeHtml(sug)}</div>`;
  html += `<div class="actions">`;
  html += `<button class="btn" data-hl-action="copy">${LOCALE==='es'?'Copiar texto':'Copy text'}</button>`;
  html += `<button class="btn" data-hl-action="dismiss">${LOCALE==='es'?'Ocultar':'Dismiss'}</button>`;
  html += `<button class="btn" data-hl-action="undo" ${_undo.length? '':'disabled'}>${LOCALE==='es'?'Deshacer':'Undo'}</button>`;
  html += `<button class="btn primary" data-hl-action="apply" ${rep ? '' : 'disabled'}>${LOCALE==='es'?'Aplicar cambio':'Apply fix'}</button>`;
  html += `</div>`;
  if(multi && multi.length){
    html += `<div class="multi"><h5>${LOCALE==='es'?'Otros problemas en este tramo:':'Other issues in this span:'}</h5><ul>`;
    for(const it of multi){
      const line = `${escapeHtml(it.category||'')} — ${escapeHtml(it.msg||'')}`;
      html += `<li>${line}</li>`;
    }
    html += `</ul></div>`;
  }
  return html;
}

function showTipForMark(mark, clientX, clientY){
  const tip = ensureHLTip();
  _HL_ACTIVE_MARK = mark;
  tip.innerHTML = buildTipHTML(mark);
  tip.style.display = 'block';
  tip.setAttribute('aria-hidden','false');

  // Position
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  const rect = tip.getBoundingClientRect();
  let x = (clientX ?? 0) + 12, y = (clientY ?? 0) + 12;
  if(x + rect.width > vw - 8) x = vw - rect.width - 8;
  if(y + rect.height > vh - 8) y = vh - rect.height - 8;
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
function hideTip(){
  const tip = ensureHLTip();
  tip.setAttribute('aria-hidden','true');
  tip.style.display = 'none';
}

// Merge server feedback into highlight issues
function normalizeIssues(data){
  const out = Array.isArray(data?.issues) ? [...data.issues] : [];
  // Register violations
  const regs = data?.checks?.register?.violations || [];
  regs.forEach(v=>{
    if (Array.isArray(v.span)){
      out.push({
        span: v.span,
        category: 'register',
        severity: 'minor',
        msg: (LOCALE==='es' ? 'Registro' : 'Register') + (v.type? `: ${v.type}`:''),
        suggestion: v.suggest || '',
        replacement: v.suggest || ''
      });
    }
  });
  // Cohesion repetitions
  const reps = data?.checks?.cohesion?.repetitions || [];
  reps.forEach(r=>{
    if (Array.isArray(r.span)){
      out.push({
        span: r.span,
        category: 'cohesion',
        severity: 'minor',
        msg: (LOCALE==='es' ? 'Conector repetido' : 'Repeated linker') + (r.linker? `: ${r.linker}`:''),
        suggestion: (LOCALE==='es'?'Varía las transiciones':'Vary transitions'),
        replacement: ''
      });
    }
  });
  return out;
}

function applyInlineHighlights(container, issues){
  if(!container || !issues || !issues.length) return;

  const plain = container.textContent || '';
  const totalLen = plain.length;
  const norm = issues
    .filter(it => Array.isArray(it.span) && it.span.length===2)
    .map(it => ({
      start: Math.max(0, Math.min(totalLen, it.span[0]|0)),
      end:   Math.max(0, Math.min(totalLen, it.span[1]|0)),
      category: it.category || '',
      severity: it.severity || 'minor',
      msg: it.msg || '',
      suggestion: it.suggestion || '',
      replacement: it.replacement || ''
    }))
    .filter(it => it.end > it.start);

  if(!norm.length) return;

  const cutsSet = new Set([0, totalLen]);
  norm.forEach(it => { cutsSet.add(it.start); cutsSet.add(it.end); });
  const cuts = Array.from(cutsSet).sort((a,b)=>a-b);

  function activeFor(a,b){ return norm.filter(it => it.start < b && it.end > a); }

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let plainIdx = 0, node;
  let cutIdx = 1;

  while(node = walker.nextNode()){
    let offsetInNode = 0;
    let nodeRemaining = node.nodeValue.length;

    while(nodeRemaining > 0){
      const nodeStartPlain = plainIdx;
      const nodeEndPlain = plainIdx + nodeRemaining;
      let segEndPlain = Math.min(nodeEndPlain, cuts[cutIdx] ?? nodeEndPlain);
      if(segEndPlain <= plainIdx) segEndPlain = Math.min(nodeEndPlain, (cuts[++cutIdx] ?? nodeEndPlain));

      const localStart = offsetInNode;
      const localEnd = localStart + (segEndPlain - plainIdx);

      // Guards against empty text nodes / split on empty
      let target = node;
      if (target.nodeType !== Node.TEXT_NODE || !target.nodeValue) {
        plainIdx = segEndPlain;
        offsetInNode = localEnd;
        nodeRemaining = Math.max(0, (node.nodeValue || '').length - offsetInNode);
        while(cutIdx < cuts.length && cuts[cutIdx] <= plainIdx) cutIdx++;
        continue;
      }
      if(localStart > 0 && target.nodeValue.length > 0) {
        target = target.splitText(localStart);
      }
      const sliceLen = Math.max(0, localEnd - localStart);
      if(sliceLen > 0 && sliceLen < target.nodeValue.length){
        target.splitText(sliceLen);
      }

      const active = activeFor(nodeStartPlain, segEndPlain);

      if(active.length){
        const hasMajor = active.some(a=>a.severity==='major');
        const cats = Array.from(new Set(active.map(a=>a.category).filter(Boolean)));
        const msgs = active.map(a=>a.msg).filter(Boolean).join(' • ');
        const sugs = active.map(a=>a.suggestion).filter(Boolean).join(' • ');
        const firstRep = (active.find(a=>a.replacement)?.replacement) || '';
        const mark = document.createElement('mark');
        mark.className = 'hl' + (hasMajor ? ' major' : '');
        mark.setAttribute('tabindex','0');
        mark.setAttribute('role','button');
        mark.setAttribute('aria-label', (LOCALE==='es'?'Sugerencia de':'Suggestion for') + ' ' + (cats[0]||''));
        mark.dataset.cat = cats.length>1 ? (LOCALE==='es'?'Múltiples categorías':'Multiple categories') : (cats[0]||'');
        if(msgs) mark.dataset.msg = msgs;
        if(sugs) mark.dataset.sug = sugs;
        if(firstRep) mark.dataset.rep = firstRep;
        mark.dataset.multi = JSON.stringify(
          active.slice(1).map(a=>({category:a.category||'', msg:a.msg||''})).filter(x=>x.category||x.msg)
        );

        if (target.parentNode) {
          target.parentNode.replaceChild(mark, target);
          mark.appendChild(target);
        }
      }

      plainIdx = segEndPlain;
      offsetInNode = localEnd;
      nodeRemaining = node.nodeValue.length - offsetInNode;
      while(cutIdx < cuts.length && cuts[cutIdx] <= plainIdx) cutIdx++;
    }
  }
}

// ===== Renderer =====
function renderTaskAlignment(data){
  const ta = data?.task_alignment;
  if(!ta) return '';
  const items = [];
  if(typeof ta.prompt_covered === 'boolean'){
    items.push([ta.prompt_covered, LOCALE==='es'?'Cubre la consigna':'Covers the prompt']);
  }
  if(Array.isArray(ta.bullets)){
    ta.bullets.forEach(b=>{
      items.push([!!b.covered, (LOCALE==='es'?'Viñeta: ':'Bullet: ') + (b.text||'')]);
    });
  }
  if(ta.c2_sources){
    const s = ta.c2_sources;
    items.push([!!s.present, 'C2: sources present']);
    items.push([!!s.summary_of_A, 'C2: summary of A']);
    items.push([!!s.summary_of_B, 'C2: summary of B']);
    items.push([!!s.integration,  'C2: integration']);
    items.push([!!s.evaluation,   'C2: evaluation']);
  }
  return `<div class="checklist">` + items.map(([ok,label])=>`<span class="check ${ok?'ok':''}">${escapeHtml(label)}</span>`).join('') + `</div>` +
         (ta?.c2_sources?.verbatim_overlap_pct!=null ? `<div class="muted-note">${LOCALE==='es'?'Coincidencia literal:':'Verbatim overlap:'} ${ta.c2_sources.verbatim_overlap_pct}%</div>` : '');
}

function renderCorrection(data, level){
  const out = document.getElementById('essayOut');
  const { improved_text, rubric, checks, coach_notes, band_estimate, examiner_comment } = data || {};
  const { min, max } = wordBand(level);

  clearUndoStack();

  // KPI row (plus band estimate)
  const wcActual = (checks?.word_count?.actual) ?? wcOf(improved_text || '');
  const wcOk = (checks?.word_count?.ok) ?? (wcActual>=min && wcActual<=max);
  const wcBadge = `<span class="${bandBadge(wcOk)}">Words: ${wcActual} (${min}–${max}${wcOk?' ✓': (wcActual<min?' ↓':' ↑')})</span>`;
  const synth = checks?.c2_synthesis;
  const synthBadge = (synth?.required) ? `<span class="${(synth.summary_ok && synth.evaluation_ok)?'badge ok':'badge warn'}">C2 synthesis</span>` : '';
  const regViol = (checks?.register?.violations||[]);
  const regBadge = `<span class="${regViol.length? 'badge warn':'badge ok'}">${LOCALE==='es'?'Registro':'Register'}${regViol.length? ' ⚠︎':''}</span>`;
  const bandBadgeHTML = band_estimate ? `<span class="badge">${escapeHtml((band_estimate.level||level) + ' band ' + band_estimate.band)}</span>` : '';
  const kpi = `<div class="kpi">${wcBadge} ${regBadge} ${synthBadge} ${bandBadgeHTML}</div>`;

  // Rubric tiles
  let rubricHTML = '';
  if (rubric) {
    const keys = [
      ['content', LOCALE==='es'?'Contenido':'Content'],
      ['communicative_achievement', LOCALE==='es'?'Logro comunicativo':'Communicative achievement'],
      ['organisation', LOCALE==='es'?'Organización':'Organisation'],
      ['language', LOCALE==='es'?'Lengua':'Language']
    ];
    rubricHTML = `<div class="tiles" style="display:flex;flex-wrap:wrap;gap:10px;margin:6px 0 10px">` +
      keys.map(([k,label])=>{
        const r = rubric[k] || {};
        const score = typeof r.score==='number' ? r.score : 0;
        const ev = (r.evidence||[]).slice(0,2).map(e=>`<li>${escapeHtml(e)}</li>`).join('');
        return `<div class="tile"><h4>${escapeHtml(label)}</h4><div><span class="score">${score}/5</span></div>${ev?`<ul class="list">${ev}</ul>`:''}</div>`;
      }).join('') + `</div>`;
  }

  // Examiner comment + task alignment (if present)
  const examinerHTML = examiner_comment ? `<div id="examinerComment" class="issue"><div class="cat">${LOCALE==='es'?'Comentario del examinador':'Examiner comment'}</div><div>${escapeHtml(examiner_comment)}</div></div>` : '';
  const alignHTML = data?.task_alignment ? `<div style="margin-top:8px"><div style="font-weight:600">${LOCALE==='es'?'Alineación con la tarea':'Task alignment'}</div>${renderTaskAlignment(data)}</div>` : '';

  // Issues panel (original list)
  const issuesPanel = (data?.issues||[]).length
    ? `<div style="margin-top:10px"><div style="font-weight:600">${LOCALE==='es'?'Observaciones':'Issues'}</div>${
        (data.issues||[]).map(it=>`<div class="${sevClass(it.severity)}">
          <div class="cat">${escapeHtml(it.category||'')}</div>
          <div>${escapeHtml(it.msg||'')}</div>
          ${it.suggestion? `<div><em>${LOCALE==='es'?'Sugerencia:':'Suggestion:'}</em> ${escapeHtml(it.suggestion)}</div>`:''}
        </div>`).join('')
      }</div>` : '';

  // Improved text (sanitized)
  const improvedHTML = `<h4 style="margin:12px 0 6px">${LOCALE==='es'?'Versión mejorada':'Improved version'}</h4><div id="improvedBox" class="preview"></div>`;

  out.innerHTML = `${kpi}${rubricHTML}${examinerHTML}${alignHTML}${issuesPanel}${notesHTML(coach_notes)}${improvedHTML}`;

  const box = document.getElementById('improvedBox');
  const safeHTML = DOMPurifySafe ? DOMPurifySafe(improved_text || '', {ALLOWED_TAGS:['p','em','strong','mark','ul','ol','li','span','br','i','b']}) : '';
  if(safeHTML){ box.innerHTML = safeHTML; } else { box.textContent = stripTags(improved_text||''); }

  try { applyInlineHighlights(box, normalizeIssues(data)); } catch(_){}

  const plain = box.textContent || '';
  updateSentenceAnalysis(plain);
  showWordcount(plain, level);
  saveDraft(); // persist improved output
}
function notesHTML(coach_notes){
  return (coach_notes && coach_notes.length)
    ? `<div style="margin-top:10px"><div style="font-weight:600">${LOCALE==='es'?'Notas del coach':'Coach notes'}</div><ul class="list">${coach_notes.map(n=>`<li>${escapeHtml(n)}</li>`).join('')}</ul></div>`
    : '';
}

// ===== Analyzer hook =====
function updateSentenceAnalysis(text){
  const box=document.getElementById('sentenceAnalysis');
  if (!box) return;
  try{
    box.innerHTML = text ? (window.EC_Sentences?.analyzeToHTML?.(text, { locale: LOCALE }) || "") : "";
  }catch(e){
    box.innerHTML = "";
  }
}

// ===== PDF Export (includes KPI + examiner note) =====
async function exportAnnotatedPDF(){
  const improvedBox = document.getElementById('improvedBox');

  // Guard: jsPDF available?
  const { jsPDF } = (window.jspdf || {});
  if (!jsPDF || typeof jsPDF !== 'function') {
    alert(t('misc.jspdfMissing','jsPDF not loaded'));
    return;
  }

  // Guard: has content?
  if(!improvedBox || !improvedBox.textContent.trim()){
    alert(t('misc.nothingToExport','Nothing to export yet.'));
    return;
  }

  // Build a printable wrapper
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'font-family: Inter, system-ui, Arial, sans-serif; font-size:12pt; color:#111; padding:24px; width:595pt;';
  const title = document.createElement('h2');
  title.textContent = LOCALE==='es' ? 'Ensayo corregido (anotado)' : 'Corrected Essay (Annotated)';
  title.style.margin = '0 0 8px';

  const meta = document.createElement('div');
  const lvl = document.getElementById('levelSelect')?.value || 'C1';
  const typ = document.getElementById('typeSelect')?.value || 'essay';
  meta.textContent = `${LOCALE==='es'?'Nivel':'Level'}: ${lvl} • ${LOCALE==='es'?'Tarea':'Task'}: ${typ.toUpperCase()} • ${new Date().toLocaleString(document.documentElement.lang || 'en')}`;
  meta.style.cssText='font-size:10pt; opacity:.75; margin:0 0 12px';

  const kpiClone = document.querySelector('#corrector .kpi')?.cloneNode(true);
  const examiner = document.getElementById('examinerComment')?.cloneNode(true);

  const clone = improvedBox.cloneNode(true);
  clone.style.whiteSpace = 'normal';

  wrapper.appendChild(title);
  wrapper.appendChild(meta);
  if(kpiClone){ wrapper.appendChild(kpiClone); }
  if(examiner){ wrapper.appendChild(examiner); }
  wrapper.appendChild(clone);

  // Render to PDF
  const doc = new jsPDF({ unit:'pt', format:'a4' });
  try {
    await doc.html(wrapper, { x:36, y:36, width:523, windowWidth:800, autoPaging:'text' });
  } catch(_){
    alert(t('misc.pdfFailed','PDF export failed'));
    return;
  }
  const fname = `EssayCoach_${lvl}_${typ}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(fname);
}

// ===== Timer (btnTimer) =====
let _timerInterval = null;
function formatTimer(ms){
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s/3600)).padStart(2,'0');
  const mm = String(Math.floor((s%3600)/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  return `${hh}:${mm}:${ss}`;
}
function updateTimerLabel(){
  const btn = document.getElementById('btnTimer');
  if(!btn) return;
  const start = window.SESSION?.timerStart ? Number(window.SESSION.timerStart) : null;
  if(start){
    const elapsed = Math.max(0, Date.now() - start);
    btn.textContent = ((window._i18nDict?.buttons?.stopTimer) || 'Stop timer') + ` (${formatTimer(elapsed)})`;
  } else {
    btn.textContent = (window._i18nDict?.buttons?.startTimer) || 'Start timer';
  }
}
function startTimer(){
  if(_timerInterval) return;
  window.SESSION.timerStart = Date.now();
  persistSession();
  _timerInterval = setInterval(()=>{ updateTimerLabel(); }, 1000);
  updateTimerLabel();
}
function stopTimer(){
  if(_timerInterval){ clearInterval(_timerInterval); _timerInterval = null; }
  window.SESSION.timerStart = null;
  persistSession();
  updateTimerLabel();
}

// ===== Events =====
document.addEventListener('click', async (e)=>{
  const id = e.target && e.target.id;

  if(id==='btnGoPricing'){
    document.getElementById('pricing')?.classList.remove('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  if(id==='btnStartTrial' && window.EC_CONFIG.SHOW_TRIAL){
    const days=Number(window.EC_CONFIG.TRIAL_DAYS||2); const now=Date.now();
    window.SESSION.status='trial';
    window.SESSION.trialStart=new Date(now).toISOString();
    window.SESSION.trialEnd=now+days*24*60*60*1000;
    persistSession();
    refreshGates(); showQuota(); updateTrialBanner();
  }

  // Pricing buttons (present in index.html)
  if(id==='btnChooseMonthly'){
    alert((LOCALE==='es'?'Próximamente:':'Coming soon:') + ' Monthly checkout');
  }
  if(id==='btnChooseExam'){
    alert((LOCALE==='es'?'Próximamente:':'Coming soon:') + ' Exam Pack checkout');
  }

  // Timer
  if(id==='btnTimer'){
    if(window.SESSION?.timerStart){ stopTimer(); } else { startTimer(); }
  }

  if(id==='btnCopyRules'){ try{ await navigator.clipboard.writeText(document.getElementById('punctList').innerText); }catch(_){} }
  if(id==='btnExportRules'){ alert('PDF export for rules uses the main PDF exporter. Copy the rules text and paste if needed.'); }
  if(id==='btnLogin')    alert(t('misc.comingSoonLogin','Login coming soon'));
  if(id==='btnSignUp')   alert(t('misc.comingSoonSignup','Sign up coming soon'));
  if(id==='btnManagePlan') alert(t('misc.comingSoonManage','Manage portal coming soon'));

  if(id==='btnClear'){
    document.getElementById('essayIn').value='';
    document.getElementById('essayOut').innerHTML='';
    updateSentenceAnalysis('');
    clearUndoStack();
    renderPart2Rubric('', (document.getElementById('levelSelect')?.value||'C1'),
      (document.getElementById('typeSelect')?.value||'essay'), readTask());
    try{ localStorage.removeItem(AUTOSAVE_KEY); }catch(_){}
  }

  if(id==='btnPaste'){
    try{
      const ttxt=await navigator.clipboard.readText();
      document.getElementById('essayIn').value=ttxt;
      updateSentenceAnalysis(ttxt);
      renderPart2Rubric(ttxt, (document.getElementById('levelSelect')?.value||'C1'),
        (document.getElementById('typeSelect')?.value||'essay'), readTask());
      saveDraftDebounced();
    }catch(_){}
  }

  if (id==='btnExportPDF') {
    try { await exportAnnotatedPDF(); }
    catch { alert(t('misc.pdfFailed','PDF export failed')); }
  }

  if(id==='btnCorrect'){
    const src=(document.getElementById('essayIn').value||'').trim();
    const lvl = (document.getElementById('levelSelect')?.value || 'C1');
    if(!src){ document.getElementById('essayOut').innerHTML=''; updateSentenceAnalysis(''); return; }
    document.getElementById('essayOut').innerHTML = t('misc.processing','Processing…');
    renderPart2Rubric(src, lvl, (document.getElementById('typeSelect')?.value||'essay'), readTask());
    try{
      const data = await runCorrection(src);

      if (typeof data === 'string' || typeof data?.output === 'string') {
        clearUndoStack();
        const html = (typeof data === 'string') ? data : data.output;
        const safe = DOMPurifySafe ? DOMPurifySafe(html) : escapeHtml(html);
        document.getElementById('essayOut').innerHTML = safe;
        const outText = stripTags(safe);
        updateSentenceAnalysis(outText);
        showWordcount(outText, lvl);
        saveDraft(); // persist raw HTML path too
      }
      else if (data && typeof data.improved_text === 'string') {
        renderCorrection(data, lvl);
      }
      else {
        document.getElementById('essayOut').innerHTML =
          `<div class="hint">${LOCALE==='es'?'Respuesta inesperada del servidor.':'Unexpected server response.'}</div>`;
        updateSentenceAnalysis(src);
        showWordcount(src, lvl);
      }

      window.QUOTA.used=Math.min(window.QUOTA.used+1, window.QUOTA.cap);
      persistQuota();
      showQuota();
    }
    catch(err){
      document.getElementById('essayOut').innerHTML = `<div class="hint">${escapeHtml(err.message)}</div>`;
    }
  }

  // Tooltip button actions + Toolbar undo
  const btn = e.target.closest && e.target.closest('[data-hl-action]');
  if(btn){
    const action = btn.getAttribute('data-hl-action');
    const mark = _HL_ACTIVE_MARK;
    if(action==='dismiss'){ hideTip(); return; }
    if(action==='copy' && mark){ try{ navigator.clipboard.writeText(mark.textContent || ''); }catch(_){} return; }
    if(action==='undo'){ undoLastChange(); hideTip(); return; }
    if(action==='apply' && mark){
      const rep = mark.dataset.rep || mark.dataset.sug || '';
      if(rep){
        pushUndoSnapshot();
        const textNode = document.createTextNode(rep);
        mark.replaceWith(textNode);
        hideTip();
        const improvedBox = document.getElementById('improvedBox');
        if(improvedBox){
          const plain = improvedBox.textContent || '';
          updateSentenceAnalysis(plain);
          showWordcount(plain, (document.getElementById('levelSelect')?.value||'C1'));
          saveDraft();
        }
      }
    }
  }

  if(e.target && e.target.id==='btnUndo'){ undoLastChange(); return; }
});

// Tooltip events (mouse)
document.addEventListener('mouseover', (e)=>{
  const m = e.target.closest && e.target.closest('mark.hl');
  if(m) showTipForMark(m, e.clientX, e.clientY);
});
document.addEventListener('mousemove', (e)=>{
  const tip = document.getElementById('hlTip');
  if(tip && tip.style.display==='block'){
    let x = e.clientX + 12, y = e.clientY + 12;
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    const rect = tip.getBoundingClientRect();
    if(x + rect.width > vw - 8) x = vw - rect.width - 8;
    if(y + rect.height > vh - 8) y = vh - rect.height - 8;
    tip.style.left = x + 'px'; tip.style.top  = y + 'px';
  }
});
document.addEventListener('mouseout', (e)=>{
  if(e.target.closest && e.target.closest('mark.hl')) hideTip();
});

// Keyboard open/close/apply for highlights
document.addEventListener('focusin', (e)=>{
  const m = e.target.closest && e.target.closest('mark.hl');
  if(m) showTipForMark(m, (m.getBoundingClientRect().left||0)+8, (m.getBoundingClientRect().bottom||0)+8);
});
document.addEventListener('focusout', (e)=>{
  if(e.target.closest && e.target.closest('mark.hl')) hideTip();
});
document.addEventListener('keydown', (e)=>{
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const mod = isMac ? e.metaKey : e.ctrlKey;
  // Global undo
  if(mod && !e.shiftKey && !e.altKey && e.key.toLowerCase()==='z'){
    if(_undo.length){ e.preventDefault(); undoLastChange(); }
  }
  // Mark interactions
  const m = e.target && e.target.matches && e.target.matches('mark.hl') ? e.target : null;
  if(!m) return;
  if((e.key==='Enter' || e.key===' ') && !mod){ e.preventDefault(); showTipForMark(m, (m.getBoundingClientRect().left||0)+8, (m.getBoundingClientRect().bottom||0)+8); }
  if((e.key==='Enter') && mod){ // Ctrl/Cmd+Enter => apply
    const rep = m.dataset.rep || m.dataset.sug || '';
    if(rep){
      e.preventDefault();
      pushUndoSnapshot();
      const textNode = document.createTextNode(rep);
      m.replaceWith(textNode);
      hideTip();
      const improvedBox = document.getElementById('improvedBox');
      if(improvedBox){
        const plain = improvedBox.textContent || '';
        updateSentenceAnalysis(plain);
        showWordcount(plain, (document.getElementById('levelSelect')?.value||'C1'));
        saveDraft(); // persist after apply
      }
    }
  }
  if(e.key==='Escape'){ hideTip(); }
});

// Persist input/select changes
document.addEventListener('input', (e)=>{
  if(e.target && e.target.id==='essayIn') {
    updateSentenceAnalysis(e.target.value);
    renderPart2Rubric(e.target.value, (document.getElementById('levelSelect')?.value||'C1'),
      (document.getElementById('typeSelect')?.value||'essay'), readTask());
  }
  saveDraftDebounced();
});
document.addEventListener('change', (e)=>{
  if (e.target && (e.target.id==='levelSelect' || e.target.id==='typeSelect')){
    renderTaskFields();
    const txt = document.getElementById('essayIn')?.value || '';
    renderPart2Rubric(txt, (document.getElementById('levelSelect')?.value||'C1'),
      (document.getElementById('typeSelect')?.value||'essay'), readTask());
    saveDraft();
  }
});

// ===== Init =====
async function init(){
  const dict = await loadDict(LOCALE);
  try { applyI18n(dict); } catch(e){ console.warn('i18n apply failed', e); }

  renderPunctGuide();
  restoreDraft();
  renderTaskFields();

  refreshGates();
  showQuota();
  updateTrialBanner();

  renderPart2Rubric(document.getElementById('essayIn')?.value || '',
    (document.getElementById('levelSelect')?.value||'C1'),
    (document.getElementById('typeSelect')?.value||'essay'),
    readTask());

  updateUndoUI();

  // Resume timer if persisted
  if(window.SESSION && window.SESSION.timerStart){
    const ts = Number(window.SESSION.timerStart);
    if(ts && ts < Date.now()){ // sensible check
      // do not overwrite timerStart; just start interval
      _timerInterval = setInterval(()=>{ updateTimerLabel(); }, 1000);
    } else {
      window.SESSION.timerStart = null;
      persistSession();
    }
  }
  updateTimerLabel();
}

// Because this file is loaded with `defer`, DOM is parsed when this runs.
window.addEventListener('DOMContentLoaded', init);

// Periodic UI updates
setInterval(()=>{ showQuota(); updateTrialBanner(); }, 10*60*1000);

// ---- Corrector wiring ----
function getIn(id){ return document.getElementById(id); }
function html(el, s){ el.innerHTML = s; }

async function correctEssay() {
  const essay = getIn('essayIn')?.value?.trim() || '';
  const lvl   = getIn('levelSelect')?.value || 'C1';
  const typ   = getIn('typeSelect')?.value || 'essay';

  if (!essay) { alert('Paste your essay first.'); return; }

  // DEV mock if (a) DEV=1 or (b) API is still placeholder
  const isPlaceholder = !API || /YOUR-LIVE-API/i.test(API);

  if (DEV || isPlaceholder) {
    const mock = `
      <h3>Mock correction (${lvl.toUpperCase()} – ${typ})</h3>
      <ul>
        <li><strong>Grammar:</strong> Mostly accurate; watch subject–verb agreement.</li>
        <li><strong>Lexis:</strong> Good range; avoid repetition.</li>
        <li><strong>Organisation:</strong> Clear paragraphing; improve transitions.</li>
        <li><strong>Task fulfilment:</strong> Covers all points; tighten conclusion.</li>
      </ul>
      <p><em>(DEV mock. Set <code>?api=http://127.0.0.1:8888</code> or a live API to call the server.)</em></p>
    `;
    html(getIn('essayOut'), mock);
    return;
  }

  // Real API call
  try {
    const res = await fetch(`${API}/correct`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        level: lvl,
        type: typ,
        options: {
          formal: getIn('tgFormal')?.checked,
          coachNotes: getIn('tgCoachNotes')?.checked,
          rubric: getIn('tgRubric')?.checked
        },
        text: essay
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Expect { html: "<safe html>" } from backend; DOMPurify optional
    const safe = (window.DOMPurify ? window.DOMPurify.sanitize(data.html) : data.html);
    html(getIn('essayOut'), safe || '<p>(No response)</p>');
  } catch (e) {
    console.error(e);
    html(getIn('essayOut'), `<p style="color:#b91c1c">Error: ${String(e.message||e)}</p>`);
  }
}

// Button hookup
document.addEventListener('click', (ev)=>{
  if (ev.target && ev.target.id === 'btnCorrect') { correctEssay(); }
});











