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
})();
