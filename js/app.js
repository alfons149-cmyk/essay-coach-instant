// js/app.js — EssayCoach UI
(() => {
  // ---- Mode / API ----
  window.EC = window.EC || {};
  const qs  = new URLSearchParams(location.search);
  const DEV = (typeof EC.DEV === 'boolean') ? EC.DEV : (qs.get('dev') === '1');
  const API_BASE = (EC.API_BASE || '').replace(/\/+$/, '');

  // ---- Diagnostics ----
  const ready = () => console.log('[EC] API_BASE =', API_BASE || '(mock)', 'DEV?', DEV);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();

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

  // ---- Corrector (live API or mock) ----
  EC.correct = async (payload) => {
    if (!DEV && API_BASE) {
      const url = `${API_BASE}/correct`;
      console.log('[EC] POST', url, payload);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'omit',
      });
      const text = await res.text();
      console.log('[EC] /correct', res.status, text);
      if (!res.ok) throw new Error(`API ${res.status}: ${text}`);
      return JSON.parse(text);
    }

    // --- DEV mock ---
    await sleep(300);
    const txt = payload.essay || '';
    const wc  = wcCount(txt);
    const edits = /\ba lot\b/i.test(txt)
      ? [{ from: 'a lot', to: payload.level === 'B2' ? 'much' : 'numerous', reason: 'Register' }]
      : [];
    return {
      level: payload.level,
      inputWords: wc,
      outputWords: wc,
      feedback: `✅ Mock feedback for ${payload.level}.`,
      edits,
      nextDraft: txt.replace(/\ba lot\b/gi, edits[0]?.to || 'a lot'),
      vocabularySuggestions: { 'a lot': ['many','numerous','substantially'] },
      sentenceInsights: [
        {
          example: 'This is a very good essay.',
          issue: 'Overused intensifier "very"',
          explanation: 'At higher levels we prefer more precise adjectives instead of "very + adjective".',
          betterVersion: 'This is an excellent essay.',
          linkHint: 'U7'
        }
      ]
    };
  };

  // ---- Init on load ----
  document.addEventListener('DOMContentLoaded', () => {
    reflectLangButtons();
    reflectLevelButtons();
    updateCounters();
  });

  // ---- Events ----
  document.addEventListener('click', async (e) => {
    const langBtn  = e.target.closest('[data-lang]');
    const levelBtn = e.target.closest('[data-level]');

    if (langBtn) {
      const lang = langBtn.getAttribute('data-lang');
      try {
        await I18N.load(lang);
        localStorage.setItem('ec.lang', lang);
        reflectLangButtons(lang);
        clearCounterTemplates();
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
      renderVocabSuggestions({});
      renderSentenceInsights([]);
      updateCounters();
      return;
    }

    if (e.target === el.btnCorrect) {
      const level = localStorage.getItem('ec.level') || 'C1';
      const lang  = localStorage.getItem('ec.lang')  || 'en';
      const payload = {
        level,
        lang,
        task:  (el.task?.value || ''),
        essay: (el.essay?.value || ''),
      };
      if (!payload.essay.trim()) {
        if (el.feedback) el.feedback.textContent = 'Please write or paste your essay first.';
        return;
      }

      try {
        e.target.disabled = true;
        if (el.feedback) el.feedback.textContent = '…';
        const res = await EC.correct(payload);

        // Render results
        if (el.feedback)  el.feedback.textContent = res.feedback || '—';
        if (el.nextDraft) el.nextDraft.value = res.nextDraft || '';
        if (el.edits)
          el.edits.innerHTML = (res.edits || [])
            .map(x => `<li><strong>${escapeHTML(x.from)}</strong> → <em>${escapeHTML(x.to)}</em> — ${escapeHTML(x.reason)}</li>`)
            .join('');

               // ✅ Word counters
        setCounter(el.inWC,  'io.input_words',  res.inputWords  ?? 0);
        setCounter(el.outWC, 'io.output_words', res.outputWords ?? 0);

        // ✅ Vocabulary suggestions
        renderVocabSuggestions(res.vocabularySuggestions || {});

        // ✅ Cambridge band estimate (only if scoreEssay is available)
        if (typeof window.scoreEssay === 'function') {
          const scores = {
            content: 0.7,
            communicative: 0.6,
            organisation: 0.8,
            language: 0.55
          };
          renderBands(level, scores);
        }

        // ✅ Sentence insights (from Worker)
        renderSentenceInsights(res.sentenceInsights || []);

      } catch (err) {
        console.error(err);
        if (el.feedback) el.feedback.textContent =
          '⚠️ Correction failed. Check API, CORS, or dev mode.';
      } finally {
        e.target.disabled = false;
      }

    // One-click replace in vocab suggestions
    const altBtn = e.target.closest('.vocab-alt');
    if (altBtn) {
      const key = altBtn.getAttribute('data-key') || '';
      const to  = altBtn.getAttribute('data-to')  || '';
      const targetTA = document.getElementById('nextDraft') || document.getElementById('essay');
      if (!targetTA) return;
      const ok = replaceNearest(targetTA, key, to);
      if (el.feedback)
        el.feedback.textContent = ok
          ? `Replaced “${key}” → “${to}”.`
          : `Could not find "${key}" to replace.`;
      return;
    }
  });

  if (el.essay) el.essay.addEventListener('input', updateCounters);

  window.addEventListener('ec:lang-changed', () => {
    clearCounterTemplates();
    updateCounters();
  });

  // ---- Counter helpers ----
  function setCounter(node, i18nKey, n) {
    if (!node) return;
    const ATTR = 'data-i18n-template';
    let tpl = node.getAttribute(ATTR);
    if (!tpl) {
      tpl = (window.I18N && I18N.t) ? I18N.t(i18nKey, { n: '{n}' }) : '';
      if (!tpl || !/\{n\}/.test(tpl)) {
        tpl = node.textContent && /\{n\}/.test(node.textContent)
          ? node.textContent
          : (i18nKey === 'io.input_words' ? 'Input: {n} words' : 'Output: {n} words');
      }
      node.setAttribute(ATTR, tpl);
    }
    node.textContent = tpl.replace(/\{n\}/g, n ?? 0);
  }

  function clearCounterTemplates() {
    if (el.inWC)  el.inWC.removeAttribute('data-i18n-template');
    if (el.outWC) el.outWC.removeAttribute('data-i18n-template');
  }

  function updateCounters() {
    if (!el.essay || !el.inWC || !el.outWC) return;
    const wc = wcCount(el.essay.value);
    setCounter(el.inWC,  'io.input_words',  wc);
    setCounter(el.outWC, 'io.output_words', wc);
  }

  // ---- Bands renderer ----
  function renderBands(level, scores) {
    if (typeof window.scoreEssay !== 'function') {
      console.warn('[bands] scoreEssay is not available');
      return;
    }
    const res = scoreEssay(level, scores);
    if (!res) return;

    const card     = document.getElementById('bandsCard');
    const overallEl = document.getElementById('bandsOverallScore');
    const levelEl   = document.getElementById('bandsLevel');
    const catList   = document.getElementById('bandsCategories');
    const impList   = document.getElementById('bandsImprovements');

    if (!card || !overallEl || !levelEl || !catList || !impList) return;

    overallEl.textContent = res.overall_scale ? String(res.overall_scale) : '—';
    levelEl.textContent   = res.level;

    // Categories
    catList.innerHTML = '';
    res.category_results.forEach(cr => {
      const li = document.createElement('li');
      const key     = `bands.category.${cr.category}`;
      const label   = (window.I18N && I18N.t) ? I18N.t(key) : cr.category;
      const bandKey = `bands.band.${cr.band}`;
      const bandLabel = (window.I18N && I18N.t) ? I18N.t(bandKey) : cr.band;

      li.innerHTML =
        `<strong>${escapeHTML(label)}</strong>: ${escapeHTML(bandLabel)} (${escapeHTML(cr.score_range)})<br>` +
        `<span style="font-size:0.9em;opacity:0.9;">${escapeHTML(cr.descriptor)}</span>`;
      catList.appendChild(li);
    });

    // Improvements
    impList.innerHTML = '';
    const uniqImprovements = Array.from(new Set(res.improvement_summary || []));
    uniqImprovements.forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      impList.appendChild(li);
    });

    card.hidden = false;
  }

  // ---- Vocabulary suggestions renderer ----
  function renderVocabSuggestions(vs) {
    const card = document.getElementById('vocabCard');
    const list = document.getElementById('vocab');
    if (!card || !list) return;
    const entries = Object.entries(vs || {});
    if (!entries.length) {
      card.hidden = true;
      list.innerHTML = '';
      return;
    }
    const items = entries.map(([key, arr]) => {
      const alts = (Array.isArray(arr) ? arr : [String(arr)])
        .filter(Boolean)
        .map(a =>
          `<button type="button" class="vocab-alt btn-ghost" data-key="${escapeHTML(key)}" data-to="${escapeHTML(a)}">${escapeHTML(a)}</button>`
        ).join(' ');
      return `<li><strong>${escapeHTML(key)}</strong><div class="alt-row">${alts}</div></li>`;
    });
    list.innerHTML = items.join('');
    card.hidden = false;
  }
    function renderSentenceInsights(insights) {
    const card = document.getElementById('sentencesCard');
    const list = document.getElementById('sentencesList');
    if (!card || !list) return;

    const arr = Array.isArray(insights) ? insights : [];
    if (!arr.length) {
      card.hidden = true;
      list.innerHTML = '';
      return;
    }

    const items = arr.map(si => {
      const ex   = escapeHTML(si.example || '');
      const issue = escapeHTML(si.issue || '');
      const expl = escapeHTML(si.explanation || '');
      const better = escapeHTML(si.betterVersion || '');
      const hint  = escapeHTML(si.linkHint || '');

      const hintText =
        hint
          ? `${hint} – ${I18N && I18N.t ? I18N.t('sentence.read_unit') : 'Read the unit in the Course Book.'}`
          : (I18N && I18N.t
              ? I18N.t('sentence.read_unit')
              : 'Read the unit in the Course Book.');

      return `
        <li>
          <div class="sentence-example">“${ex}”</div>
          ${issue ? `<div class="sentence-issue">${issue}</div>` : ''}
          ${expl ? `<div class="sentence-explanation">${expl}</div>` : ''}
          ${better ? `<div class="sentence-fix"><strong>Better:</strong> ${better}</div>` : ''}
          <div class="sentence-hint">
            📘 <span>${hintText}</span>
          </div>
        </li>
      `;
    });

    list.innerHTML = items.join('');
    card.hidden = false;
  }

  // ---- Sentence insights renderer ----
  function renderSentenceInsights(arr = []) {
    const card = document.getElementById('sentenceCard');
    const list = document.getElementById('sentenceInsights');
    if (!card || !list) return;

    if (!Array.isArray(arr) || !arr.length) {
      card.hidden = true;
      list.innerHTML = '';
      return;
    }

    list.innerHTML = arr.map(si => `
      <li>
        <div class="sentence-example">“${escapeHTML(si.example || '')}”</div>
        <strong>${escapeHTML(si.issue || '')}</strong>
        ${si.linkHint ? `<span class="sentence-badge">${escapeHTML(si.linkHint)}</span>` : ''}
        <br>
        <span>${escapeHTML(si.explanation || '')}</span><br>
        <em>${escapeHTML(si.betterVersion || '')}</em>
      </li>
    `).join('');

    card.hidden = false;
  }

  // ---- Replace nearest helper ----
  function replaceNearest(textarea, needle, replacement) {
    const value = textarea.value;
    const n = String(needle);
    if (!n) return false;
    const re = new RegExp(escapeForRegExp(n), 'gi');
    let match;
    const matches = [];
    while ((match = re.exec(value)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length });
      if (re.lastIndex === match.index) re.lastIndex++;
    }
    if (!matches.length) return false;
    const caret = textarea.selectionStart ?? 0;
    let target = matches.find(m => caret >= m.start && caret <= m.end);
    if (!target) {
      target = matches
        .map(m => ({ m, d: Math.min(Math.abs(caret - m.start), Math.abs(caret - m.end)) }))
        .sort((a,b) => a.d - b.d)[0].m;
    }
    const before = value.slice(0, target.start);
    const after  = value.slice(target.end);
    const next   = before + replacement + after;
    textarea.value = next;
    const newCaret = before.length + replacement.length;
    textarea.setSelectionRange(newCaret, newCaret);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  // ---- UI helpers ----
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

  // ---- Utils ----
  function wcCount(s) {
    const m = String(s || '').trim().match(/\S+/g);
    return m ? m.length : 0;
  }
  function escapeForRegExp(x) {
    return String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, m =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])
    );
  }

  // Expose for console testing
  window.renderSentenceInsights = renderSentenceInsights;
})();
