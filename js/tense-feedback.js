// Render server-resolved teaching evidence. Never infer corrections from keyword matches.
(() => {
  const COPY = {
    en: {
      title: 'Time frames and signal words',
      hint: 'Alfons’ method: connect the signal, time frame and meaning to the verb form. These are selected examples from your text.',
      present: 'Present', past: 'Past', future: 'Future', mixed: 'Mixed time frames', uncertain: 'Context needed',
      correct: 'Valid use', correction: 'Correction', context_needed: 'Check the context',
      signals: 'Signals', implicit: 'The meaning and verb forms establish the time frame.',
      guide: 'Tenses & signal words — Alfons’ guide', clauses: 'Time frame per clause', forms: 'Verb forms', context: 'Connected context', revised: 'Corrected sentence',
      note: 'Signal words are clues. The meaning and scope of each clause determine the appropriate form.'
    },
    nl: {
      title: 'Tijdskaders en signaalwoorden',
      hint: 'Alfons’ methode: verbind het signaal, het tijdskader en de betekenis met de werkwoordvorm. Hieronder staan geselecteerde voorbeelden uit je tekst.',
      present: 'Tegenwoordige tijd', past: 'Verleden tijd', future: 'Toekomst', mixed: 'Verschillende tijdskaders', uncertain: 'Context nodig',
      correct: 'Correct gebruik', correction: 'Correctie', context_needed: 'Controleer de context',
      signals: 'Signalen', implicit: 'De betekenis en werkwoordvormen bepalen hier het tijdskader.',
      guide: 'Tenses & signaalwoorden — Alfons’ overzicht', clauses: 'Tijdskader per zinsdeel', forms: 'Werkwoordvormen', context: 'Bijbehorende context', revised: 'Gecorrigeerde zin',
      note: 'Signaalwoorden geven richting. De betekenis en reikwijdte van elke bijzin bepalen welke vorm past.'
    },
    es: {
      title: 'Marcos temporales y palabras clave',
      hint: 'Método de Alfons: relaciona la palabra clave, el marco temporal y el significado con la forma verbal. Estos son ejemplos seleccionados de tu texto.',
      present: 'Presente', past: 'Pasado', future: 'Futuro', mixed: 'Marcos temporales diferentes', uncertain: 'Falta contexto',
      correct: 'Uso correcto', correction: 'Corrección', context_needed: 'Comprueba el contexto',
      signals: 'Palabras clave', implicit: 'El significado y las formas verbales establecen el marco temporal.',
      guide: 'Tiempos y palabras clave — guía de Alfons', clauses: 'Marco temporal de cada oración', forms: 'Formas verbales', context: 'Contexto relacionado', revised: 'Frase corregida',
      note: 'Las palabras clave son pistas. El significado y el alcance de cada cláusula determinan la forma adecuada.'
    }
  };
  const FRAMES = ['present', 'past', 'future', 'mixed', 'uncertain'];
  const STATUSES = ['correct', 'correction', 'context_needed'];

  function renderContextNotes(response, essay) {
    const box=document.getElementById('nextDraftContext');
    if(!box) return;
    box.replaceChildren();box.hidden=true;
    const notes=response?.schemaVersion===2 && Array.isArray(response.contextNotes) ? response.contextNotes : [];
    const seen=new Set();
    for(const note of notes) {
      if(!note || typeof note.example!=='string' || !note.example || !essay.includes(note.example) ||
         typeof note.title!=='string' || typeof note.explanation!=='string' || !note.explanation.trim() || seen.has(note.explanation)) continue;
      const title=document.createElement('strong'),p=document.createElement('p');
      title.textContent=note.title;p.textContent=note.explanation;box.append(title,p);
      seen.add(note.explanation);
    }
    box.hidden=!seen.size;
  }

  function renderSignalHints(card,response,essay,language) {
    const copy={
      nl:{title:'Signaalwoorden — korte uitleg',hint:'Enkele aanwijzingen uit je tekst. Ze bepalen niet automatisch de werkwoordvorm.'},
      es:{title:'Palabras clave — explicación breve',hint:'Algunas pistas de tu texto. No determinan automáticamente la forma verbal.'},
      en:{title:'Signal words — brief reminders',hint:'A few clues from your text. They do not automatically determine the verb form.'}
    }[language] || {title:'Signal words — brief reminders',hint:'A few clues from your text. They do not automatically determine the verb form.'};
    const hints=(Array.isArray(response.signalHints)?response.signalHints:[]).filter(h=>h && typeof h.example==='string' && h.example && essay.includes(h.example) &&
      typeof h.explanation==='string' && h.explanation.trim() && Array.isArray(h.signals) && h.signals.length &&
      h.signals.every(s=>typeof s==='string' && s && h.example.includes(s))).slice(0,3);
    if(!hints.length) return;
    const doc=card.ownerDocument;
    const node=(tag,text)=>{const n=doc.createElement(tag);n.textContent=text;return n;};
    const title=node('h2',copy.title);title.id='tenseAnalysisTitle';title.className='app-block__title';
    const list=doc.createElement('ol');list.className='tense-list';
    for(const hint of hints) {
      const item=doc.createElement('li');item.className='tense-entry';
      item.append(node('strong',hint.signals.join(' · ')),node('p',hint.explanation),node('blockquote',hint.example));
      list.append(item);
    }
    const guide=node('a',(COPY[language]||COPY.en).guide);
    guide.href=`tenses.html?lang=${Object.hasOwn(COPY,language)?language:'en'}`;
    card.append(title,node('p',copy.hint),list,guide);card.hidden=false;
  }

  function render(card, response, essay, language = 'en') {
    renderContextNotes(response,typeof essay==='string'?essay:'');
    if (!card) return;
    card.replaceChildren();
    card.hidden = true;
    if(response?.schemaVersion===2 && response.feedbackMode==='focused') {
      renderSignalHints(card,response,typeof essay==='string'?essay:'',language);return;
    }
    if (response?.schemaVersion !== 2 || !Array.isArray(response.tenseAnalysis)) return;
    const original = typeof essay === 'string' ? essay : '';
    const entries = response.tenseAnalysis.filter(e => e && typeof e.example === 'string' &&
      e.example.length >= 8 && original.includes(e.example) && FRAMES.includes(e.timeFrame) &&
      STATUSES.includes(e.status) && typeof e.explanation === 'string' && e.explanation.trim() &&
      Array.isArray(e.forms) && e.forms.length && e.forms.every(f => typeof f === 'string') &&
      Array.isArray(e.signals) && e.signals.every(s => typeof s === 'string' && s.trim()) &&
      (e.status !== 'correction' || (typeof e.correctedVersion === 'string' && e.correctedVersion &&
        response.edits?.some(edit => edit.kind === 'correction' && edit.from === e.example && edit.to === e.correctedVersion)))
    ).slice(0, 8);
    if (!entries.length) return;
    const copy = COPY[language] || COPY.en;
    const doc = card.ownerDocument;
    const node = (tag, content, className) => {
      const el = doc.createElement(tag);
      if (content) el.textContent = content;
      if (className) el.className = className;
      return el;
    };
    // Match literal excerpts, never parse user/model content as HTML or a regular expression.
    function quote(text, signals) {
      const q = node('blockquote', '', 'tense-quote');
      const matches = [...new Set(signals)].filter(s => s && text.includes(s)).sort((a,b) => b.length-a.length);
      let cursor = 0;
      while (cursor < text.length) {
        let start = text.length, signal = '';
        for (const s of matches) {
          const at = text.indexOf(s, cursor);
          if (at !== -1 && at < start) { start = at; signal = s; }
        }
        q.append(doc.createTextNode(text.slice(cursor, start)));
        if (!signal) break;
        q.append(node('mark', signal));
        cursor = start + signal.length;
      }
      return q;
    }
    const header = node('header', '', 'app-block__header');
    const title = node('h2', copy.title, 'app-block__title');
    title.id = 'tenseAnalysisTitle';
    header.append(title, node('p', copy.hint, 'app-block__hint'));
    const list = node('ol', '', 'tense-list');
    for (const entry of entries) {
      const li = node('li', '', 'tense-entry');
      li.dataset.frame = entry.timeFrame;
      const context = Array.isArray(entry.context) ? entry.context.filter(c => c &&
        typeof c.example === 'string' && c.example.length >= 8 && original.includes(c.example)) : [];
      const sources = [entry.example, ...context.map(c => c.example)];
      const signals = entry.signals.filter(s => sources.some(t => t.includes(s))).slice(0,4);
      const badges = node('p', '', 'tense-badges');
      badges.append(node('strong', copy[entry.timeFrame], 'tense-frame'), node('span', copy[entry.status]));
      li.append(badges);
      if(entry.status==='context_needed') li.append(node('p',entry.explanation,'ec-context-warning'));
      li.append(quote(entry.example, signals));
      li.append(node('p', signals.length ? `${copy.signals}: ${signals.join(' · ')}` : copy.implicit));
      li.append(node('p', `${copy.forms}: ${entry.forms.slice(0,4).join(' · ')}`, 'tense-forms'));
      if(entry.status!=='context_needed') li.append(node('p', entry.explanation));
      if (Array.isArray(entry.clauses)) {
        const clauses=entry.clauses.filter(c=>c && typeof c.quote==='string' && c.quote && entry.example.includes(c.quote) &&
          ['present','past','future','uncertain'].includes(c.timeFrame) && typeof c.form==='string').slice(0,4);
        if(clauses.length) {
          const detail=node('details');detail.append(node('summary',copy.clauses));
          clauses.forEach(c=>{const p=node('p');p.append(node('q',c.quote),doc.createTextNode(` — ${copy[c.timeFrame]} · ${c.form}`));detail.append(p);});
          li.append(detail);
        }
      }
      if (entry.status === 'correction') li.append(node('p', `${copy.revised}: ${entry.correctedVersion}`, 'tense-revised'));
      if (context.length) {
        const details = node('details');
        details.append(node('summary', copy.context));
        context.slice(0,3).forEach(c => details.append(quote(c.example, signals)));
        li.append(details);
      }
      list.append(li);
    }
    card.append(header, list, node('p', copy.note, 'app-block__hint'));
    const guide=node('a',copy.guide);guide.href=`tenses.html?lang=${Object.hasOwn(COPY,language)?language:'en'}#perfect`;
    card.append(guide);
    card.hidden = false;
  }
  function renderGuideLink(language='en') {
    const lang=Object.hasOwn(COPY,language)?language:'en';
    const link=document.getElementById('tenseGuideLink');
    if(link){link.textContent=COPY[lang].guide;link.href=`tenses.html?lang=${lang}`;}
  }
  window.ECTenseFeedback = {render,renderGuideLink};
})();
