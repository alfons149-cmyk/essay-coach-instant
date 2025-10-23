// js/app.js
(() => {
  // ---------- Config / DEV mode ----------
  const qs = new URLSearchParams(location.search);
  const DEV = qs.get('dev') === '1';

  window.EC = window.EC || {};
  const API_BASE = EC.API_BASE || null;

  // Provide EC.correct either via API or dev mock
  EC.correct = async function (payload) {
    if (!DEV && API_BASE) {
      const res = await fetch(`${API_BASE}/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      return res.json();
    }
    // ---- DEV MOCK ----
    await sleep(500);
    const txt = payload.essay || '';
    const wc = countWords(txt);
    const edits = buildMockEdits(payload.level, txt);
    const next = applyEdits(txt, edits);
    return {
      level: payload.level,
      inputWords: wc,
      outputWords: countWords(next),
      feedback: `✅ Mock feedback for ${payload.level}. Focus on clarity, cohesion, and task fulfilment.`,
      edits,
      nextDraft: next,
    };
  };

  // ---------- State ----------
  const state = {
    level: localStorage.getItem('ec.level') || 'C1',
    lang:  localStorage.getItem('ec.lang')  || (document.documentElement.lang || 'en'),
  };

  // ---------- DOM helpers ----------
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const el = {
    task:       $('#task'),
    essay:      $('#essay'),
    nextDraft:  $('#nextDraft'),
    feedback:   $('#feedback'),
    edits:      $('#edits'),
    btnCorrect: $('#btnCorrect'),
    btnClear:   $('#btnClear'),
    inWC:       $('#inWC'),
    outWC:      $('#outWC'),
  };

  // Warn if expected elements are missing (helps catch HTML typos)
  for (const [k, v] of Object.entries(el)) {
    if (!v) console.warn(`[app] Missing element for ${k}`);
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', () => {
    reflectActiveLanguage();
    reflectActiveLevel();
    updateCounters();
  });

  // Live word count
  if (el.essay) {
    ['input', 'change'].forEach(ev => el.essay.addEventListener(ev, updateCounters));
  }

  // ---------- Event delegation ----------
  document.addEventListener('click', async (e) => {
    // Language buttons
    const langBtn = e.target.closest('[data-lang]');
    if (langBtn) {
      const lang = langBtn.getAttribute('data-lang');
      try {
        await I18N.load(lang);                 // translate DOM
        state.lang = lang;
        localStorage.setItem('ec.lang', lang);
        document.documentElement.lang = lang;
        reflectActiveLanguage();
        updateCounters();                      // update localized counters text
      } catch (err) {
        console.error('[lang] failed to load', err);
      }
      return;
    }

    // Level buttons
    const levelBtn = e.target.closest('[data-level]');
    if (levelBtn) {
      state.level = levelBtn.getAttribute('data-level');
      localStorage.setItem('ec.level', state.level);
      reflectActiveLevel();
      return;
    }

    // Clear
    if (e.target === el.btnClear) {
      handleClear();
      return;
    }

    // Correct
    if (e.target === el.btnCorrect) {
      handleCorrect();
      return;
    }
  });

  // ---------- Handlers ----------
  function handleClear() {
    if (el.task)      el.task.value = '';
    if (el.essay)     el.essay.value = '';
    if (el.nextDraft) el.nextDraft.value = '';
    if (el.feedback)  el.feedback.textContent = '—';
    if (el.edits)     el.edits.innerHTML = '';
    updateCounters();
  }

  async function handleCorrect() {
    if (!el.btnCorrect || !el.essay) return;

    const payload = {
      level: state.level,
      task:  (el.task?.value || ''),
      essay: (el.essay.value || ''),
    };

    if (!payload.essay.trim()) {
      if (el.feedback) el.feedback.textContent = 'Please write or paste your essay first.';
      return;
    }

    try {
      el.btnCorrect.disabled = true;
      if (el.feedback) el.feedback.textContent = '…';
      const res = await EC.correct(payload);

      // Render
      if (el.feedback)  el.feedback.textContent = res.feedback || '—';
      if (el.nextDraft) el.nextDraft.value = res.nextDraft || '';
      if (el.edits) {
        el.edits.innerHTML = (res.edits || [])
          .map(e => `<li><strong>${escapeHTML(e.from)}</strong> → <em>${escapeHTML(e.to)}</em> — ${escapeHTML(e.reason)}</li>`)
          .join('');
      }

      // Counters (use localized strings currently in DOM if present)
      setCounter(el.inWC,  res.inputWords,  'Input: {n} words');
      setCounter(el.outWC, res.outputWords, 'Output: {n} words');
    } catch (err) {
      console.error(err);
      if (el.feedback) el.feedback.textContent = '⚠️ Correction failed. Check API or dev mode.';
    } finally {
      el.btnCorrect.disabled = false;
    }
  }

  // ---------- UI helpers ----------
  function reflectActiveLanguage() {
    $$('.btn-ghost, .btn-primary, [data-lang]').forEach(b => {
      if (!b.hasAttribute('data-lang')) return;
      const active = b.getAttribute('data-lang') === state.lang;
      b.setAttribute('aria-pressed', String(active));
      b.classList.toggle('btn-primary', active);
      b.classList.toggle('btn-ghost', !active);
    });
  }

  function reflectActiveLevel() {
    $$('[data-level]').forEach(b => {
      const active = b.getAttribute('data-level') === state.level;
      b.setAttribute('aria-pressed', String(active));
      b.classList.toggle('pill--active', active);
    });
  }

  function updateCounters() {
    const wc = countWords(el.essay?.value || '');
    setCounter(el.inWC,  wc, 'Input: {n} words');
    setCounter(el.outWC, wc, 'Output: {n} words');
  }

  function setCounter(node, n, fallback) {
    if (!node) return;
    // If node has translated content with "{n}", reuse it; else use fallback
    const s = node.getAttribute('data-i18n') ? node.textContent : fallback;
    node.textContent = (s || fallback).replace(/\{n\}/, n ?? 0);
  }

  // ---------- Text utilities ----------
  function countWords(text) {
    const t = String(text || '').trim();
    return t ? t.split(/\s+/).length : 0;
  }

  function buildMockEdits(level, text) {
    const edits = [];
    const push = (re, from, to, reason) => { if (re.test(text)) edits.push({ from, to, reason }); };

    if (/\ba lot\b/i.test(text)) {
      push(/\ba lot\b/i, 'a lot', level === 'B2' ? 'much' : 'substantially',
        level === 'B2' ? 'Conciseness' : 'Higher-register vocabulary');
    }
    if (/\bis\b/i.test(text) && (level === 'C1' || level === 'C2')) {
      push(/\bis\b/i, 'is', level === 'C2' ? 'appears to be' : 'seems',
        level === 'C2' ? 'Hedging for academic tone (C2)' : 'Academic tone (C1)');
    }
    if (/\bvery important\b/i.test(text)) {
      push(/\bvery important\b/i, 'very important', level === 'C2' ? 'paramount' : 'crucial', 'Lexical upgrade');
    }
    return edits;
  }

  function applyEdits(text, edits) {
    let out = text;
    for (const e of edits) {
      const re = new RegExp(`\\b${escapeRegExp(e.from)}\\b`, 'i');
      out = out.replace(re, e.to);
    }
    return out;
  }

  function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function escapeHTML(s)   { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
})();
