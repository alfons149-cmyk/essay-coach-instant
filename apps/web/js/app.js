// js/app.js — single IIFE, clean wiring, live API or mock in dev
(() => {
  // ---- Config / mode ----
  window.EC = window.EC || {};
  const qs  = new URLSearchParams(location.search);
  const DEV = (typeof EC.DEV === 'boolean') ? EC.DEV : (qs.get('dev') === '1');
  const API_BASE = (EC.API_BASE || '').replace(/\/+$/,''); // expect .../api

  // ---- Diagnostics (optional) ----
  const onReady = () => console.log('[EC] API_BASE =', API_BASE || '(mock)', 'DEV?', DEV);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady); else onReady();

  // ---- DOM refs ----
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const el = {
    task:       $('#task'),
    essay:      $('#essay'),
    nextDraft:  $('#nextDraft'),
    feedback:   $('#feedback'),
    edits:      $('#edits'),
    inWC:       $('#inWC'),
    outWC:      $('#outWC'),
    btnCorrect: $('#btnCorrect'),
    btnClear:   $('#btnClear'),
  };

  // ---- Corrector (live when not DEV and API_BASE present; else mock) ----
  EC.correct = async (payload) => {
    if (!DEV && API_BASE) {
      const url = `${API_BASE}/correct`;
      console.log('[EC] POST', url, payload);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(payload),
        credentials: 'omit'
      });
      const text = await res.text();
      console.log('[EC] /correct', res.status, text);
      if (!res.ok) throw new Error(`API ${res.status}: ${text}`);
      return JSON.parse(text);
    }
    // --- DEV mock ---
    await new Promise(r => setTimeout(r, 300));
    const txt = payload.essay || '';
    const wc  = txt.trim() ? txt.trim().split(/\s+/).length : 0;
    const edits = /\ba lot\b/i.test(txt)
      ? [{ from: 'a lot', to: payload.level === 'B2' ? 'much' : 'substantially', reason: 'Register' }]
      : [];
    return {
      level: payload.level,
      inputWords: wc,
      outputWords: wc,
      feedback: `✅ Mock feedback for ${payload.level}.`,
      edits,
      nextDraft: txt.replace(/\ba lot\b/gi, edits[0]?.to || 'a lot')
    };
  };
  // Render vocabulary suggestions
renderVocabSuggestions(res.vocabularySuggestions || {});

  // ---- Init on load ----
  document.addEventListener('DOMContentLoaded', () => {
    reflectLangButtons();
    reflectLevelButtons();
    updateCounters();
  });

  // ---- Events (delegated) ----
  document.addEventListener('click', async (e) => {
    const langBtn  = e.target.closest('[data-lang]');
    const levelBtn = e.target.closest('[data-level]');

    if (langBtn) {
      const lang = langBtn.getAttribute('data-lang');
      try {
        await I18N.load(lang);
        localStorage.setItem('ec.lang', lang);
        reflectLangButtons(lang);
        updateCounters();
      } catch (err) {
        console.error('[i18n]', err);
      }
      return;
    }

    if (levelBtn) {
      const level = levelBtn.getAttribute('data-level');
      localStorage.setItem('ec.level', level);
      reflectLevelButtons(level);
      return;
    }

    if (e.target === el.btnClear) {
      if (el.task)      el.task.value = '';
      if (el.essay)     el.essay.value = '';
      if (el.nextDraft) el.nextDraft.value = '';
      if (el.feedback)  el.feedback.textContent = '—';
      if (el.edits)     el.edits.innerHTML = '';
      updateCounters();
      return;
    }

    if (e.target === el.btnCorrect) {
      const level = localStorage.getItem('ec.level') || 'C1';
      const payload = {
        level,
        task:  (el.task?.value || ''),
        essay: (el.essay?.value || '')
      };
      if (!payload.essay.trim()) {
        if (el.feedback) el.feedback.textContent = 'Please write or paste your essay first.';
        return;
      }
      try {
        e.target.disabled = true;
        if (el.feedback) el.feedback.textContent = '…';
        const res = await EC.correct(payload);

        if (el.feedback)  el.feedback.textContent = res.feedback || '—';
        if (el.nextDraft) el.nextDraft.value = res.nextDraft || '';
        if (el.edits)     el.edits.innerHTML = (res.edits || [])
          .map(x => `<li><strong>${escapeHTML(x.from)}</strong> → <em>${escapeHTML(x.to)}</em> — ${escapeHTML(x.reason)}</li>`)
          .join('');

        if (el.inWC)  el.inWC.textContent  = I18N.t('io.input_words',  { n: res.inputWords  ?? 0 });
        if (el.outWC) el.outWC.textContent = I18N.t('io.output_words', { n: res.outputWords ?? 0 });
      } catch (err) {
        console.error(err);
        if (el.feedback) el.feedback.textContent = '⚠️ Correction failed. Check API, CORS, or dev mode.';
      } finally {
        e.target.disabled = false;
      }
    }
  });

  if (el.essay) el.essay.addEventListener('input', updateCounters);

  // ---- UI helpers ----
  function updateCounters() {
    if (!el.essay || !el.inWC || !el.outWC) return;
    const wc = el.essay.value.trim() ? el.essay.value.trim().split(/\s+/).length : 0;
    el.inWC.textContent  = I18N.t('io.input_words',  { n: wc });
    // keep output in sync until API responds
    if (el.outWC.textContent.includes('{n}')) {
      el.outWC.textContent = I18N.t('io.output_words', { n: wc });
    }
  }

  function reflectLangButtons(lang = (localStorage.getItem('ec.lang') || 'en')) {
    $$('[data-lang]').forEach(b => {
      const a = b.getAttribute('data-lang') === lang;
      b.classList.toggle('btn-primary', a);
      b.classList.toggle('btn-ghost', !a);
      b.setAttribute('aria-pressed', String(a));
    });
  }

  function reflectLevelButtons(level = (localStorage.getItem('ec.level') || 'C1')) {
    $$('[data-level]').forEach(b => {
      const a = b.getAttribute('data-level') === level;
      b.classList.toggle('pill--active', a);
      b.setAttribute('aria-pressed', String(a));
    });
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  // --- Vocabulary suggestions renderer + helpers ---
function renderVocabSuggestions(vs) {
  const card = document.getElementById('vocabCard');
  const list = document.getElementById('vocab');
  if (!card || !list) return;

  const entries = Object.entries(vs);
  if (!entries.length) {
    card.hidden = true;
    list.innerHTML = '';
    return;
  }

  const items = entries.map(([key, arr]) => {
    const alts = (Array.isArray(arr) ? arr : [String(arr)])
      .filter(Boolean)
      .map(a => `<button type="button" class="vocab-alt btn-ghost" data-key="${escapeHTML(key)}" data-to="${escapeHTML(a)}">${escapeHTML(a)}</button>`)
      .join(' ');
    return `<li><strong>${escapeHTML(key)}</strong><div class="alt-row">${alts}</div></li>`;
  });

  list.innerHTML = items.join('');
  card.hidden = false;
}

// Replace the occurrence of `needle` nearest to the caret in `textarea`.
// If caret isn’t inside a match, replace the first match. Case-insensitive.
function replaceNearest(textarea, needle, replacement) {
  const value = textarea.value;
  const n = String(needle);
  if (!n) return false;

  // Case-insensitive search of all matches
  const re = new RegExp(escapeForRegExp(n), 'gi');
  let match;
  const matches = [];
  while ((match = re.exec(value)) !== null) {
    matches.push({ start: match.index, end: match.index + match[0].length });
    if (re.lastIndex === match.index) re.lastIndex++; // avoid infinite loop
  }
  if (!matches.length) return false;

  const caret = textarea.selectionStart ?? 0;
  // Find match that contains caret, else nearest by distance
  let target = matches.find(m => caret >= m.start && caret <= m.end);
  if (!target) {
    target = matches
      .map(m => ({ m, d: Math.min(Math.abs(caret - m.start), Math.abs(caret - m.end)) }))
      .sort((a,b) => a.d - b.d)[0].m;
  }

  const before = value.slice(0, target.start);
  const after  = value.slice(target.end);
  const next   = before + replacement + after;

  // Commit change and move caret
  textarea.value = next;
  const newCaret = before.length + replacement.length;
  textarea.setSelectionRange(newCaret, newCaret);
  textarea.dispatchEvent(new Event('input', { bubbles: true })); // refresh counters
  return true;
}

function escapeForRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
})();
