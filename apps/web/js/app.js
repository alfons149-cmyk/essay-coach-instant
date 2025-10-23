// keep just ONE IIFE like this
(() => {
  const qs = new URLSearchParams(location.search);
  const DEV = qs.get('dev') === '1';
  window.EC = window.EC || {};
  const API_BASE = EC.API_BASE || null;

  EC.correct = async (payload) => {
    if (!DEV && API_BASE) {
      const r = await fetch(`${API_BASE}/correct`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error(`API ${r.status}`);
      return r.json();
    }
    // DEV mock
    await new Promise(r => setTimeout(r, 400));
    const txt = payload.essay || '';
    const wc  = txt.trim() ? txt.trim().split(/\s+/).length : 0;
    const edits = txt.includes('a lot') ? [{from:'a lot', to: payload.level==='B2' ? 'much' : 'substantially', reason:'Register'}] : [];
    return { level: payload.level, inputWords: wc, outputWords: wc, feedback:`✅ Mock feedback for ${payload.level}.`, edits, nextDraft: txt.replace(/\ba lot\b/i, edits[0]?.to || 'a lot') };
  };

  const $ = s => document.querySelector(s);
  const el = { task:$('#task'), essay:$('#essay'), nextDraft:$('#nextDraft'), feedback:$('#feedback'), edits:$('#edits'), inWC:$('#inWC'), outWC:$('#outWC'), btnCorrect:$('#btnCorrect'), btnClear:$('#btnClear') };

  document.addEventListener('DOMContentLoaded', () => updateCounters());

  document.addEventListener('click', async (e) => {
    const langBtn  = e.target.closest('[data-lang]');
    const levelBtn = e.target.closest('[data-level]');

    if (langBtn) {
      const lang = langBtn.getAttribute('data-lang');
      await I18N.load(lang).catch(console.error);
      localStorage.setItem('ec.lang', lang);
      updateCounters();
      reflectLangButtons(lang);
      return;
    }
    if (levelBtn) {
      localStorage.setItem('ec.level', levelBtn.getAttribute('data-level'));
      reflectLevelButtons();
      return;
    }
    if (e.target === el.btnClear) {
      el.task.value = ''; el.essay.value = ''; el.nextDraft.value=''; el.feedback.textContent='—'; el.edits.innerHTML='';
      updateCounters();
      return;
    }
    if (e.target === el.btnCorrect) {
      const level = localStorage.getItem('ec.level') || 'C1';
      const res = await EC.correct({ level, task: el.task.value||'', essay: el.essay.value||'' }).catch(err => (el.feedback.textContent='⚠️ Correction failed', console.error(err)));
      if (!res) return;
      el.feedback.textContent = res.feedback || '—';
      el.nextDraft.value = res.nextDraft || '';
      el.edits.innerHTML = (res.edits||[]).map(e=>`<li><strong>${e.from}</strong> → <em>${e.to}</em> — ${e.reason}</li>`).join('');
      el.inWC.textContent  = I18N.t('io.input_words',  { n: res.inputWords  ?? 0 });
      el.outWC.textContent = I18N.t('io.output_words', { n: res.outputWords ?? 0 });
    }
  });

  if (el.essay) el.essay.addEventListener('input', updateCounters);

  function updateCounters() {
    if (!el.essay || !el.inWC || !el.outWC) return;
    const wc = el.essay.value.trim() ? el.essay.value.trim().split(/\s+/).length : 0;
    el.inWC.textContent  = I18N.t('io.input_words',  { n: wc });
    el.outWC.textContent = I18N.t('io.output_words', { n: wc });
  }
  function reflectLangButtons(lang = (localStorage.getItem('ec.lang')||'en')) {
    document.querySelectorAll('[data-lang]').forEach(b=>{
      const a = b.getAttribute('data-lang')===lang;
      b.classList.toggle('btn-primary', a);
      b.classList.toggle('btn-ghost', !a);
    });
  }
  function reflectLevelButtons(level = (localStorage.getItem('ec.level')||'C1')) {
    document.querySelectorAll('[data-level]').forEach(b=>{
      const a = b.getAttribute('data-level')===level;
      b.setAttribute('aria-pressed', String(a));
      b.classList.toggle('pill--active', a);
    });
  }
})();
