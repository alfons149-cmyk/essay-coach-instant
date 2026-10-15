// Evidence-backed task and learning feedback. Model/student text is never HTML.
(() => {
  const COPY={
    en:{title:'Does your essay answer the task?',expected:'What the task asks',assumed:'The writing instructions are missing. This review assumes the usual C2 two-source summary and evaluation task.',
      answered:'Task answered',partly_answered:'Task partly answered',not_answered:'Task not answered',not_assessable:'Task achievement cannot be assessed',
      task_coverage:'Required content',source_accuracy:'Accurate source interpretation',evaluation:'Evaluation of the arguments',own_position:'Your supported position',organisation:'Organisation',register:'Style and register',
      met:'Met',partial:'Partly met',missing:'Not demonstrated',not_applicable:'Not applicable',sources:'Check the source against your essay',covered:'Accurately covered',distorted:'Source misinterpreted',
      source:'Source evidence',student:'Your writing',learn:'Your next learning steps',correction:'Correction',development:'Develop your answer',optional:'Optional practice',why:'Why this matters',
      example:'Example to study — not inserted automatically',practice:'Try it yourself',check:'Check your reasoning',next:'Rewrite the relevant passage in your essay, then submit it again. Examples illustrate an approach; they are not the only acceptable answer.',
      draft:'This draft contains language corrections only. The task is not yet fully answered: use the learning steps above to revise the content or structure yourself.',draftUnknown:'This draft contains language corrections only. Supply the complete task to check whether it answers the question.',reference:'C2 essay requirements — Cambridge English'},
    nl:{title:'Beantwoordt je essay de opdracht?',expected:'Wat de opdracht vraagt',assumed:'De schrijfinstructies ontbreken. Deze beoordeling gaat uit van de gebruikelijke C2-opdracht: twee bronnen samenvatten en evalueren.',
      answered:'Opdracht beantwoord',partly_answered:'Opdracht gedeeltelijk beantwoord',not_answered:'Opdracht niet beantwoord',not_assessable:'Opdrachtuitvoering niet te beoordelen',
      task_coverage:'Gevraagde inhoud',source_accuracy:'Juiste broninterpretatie',evaluation:'Beoordeling van de argumenten',own_position:'Je onderbouwde standpunt',organisation:'Opbouw',register:'Stijl en register',
      met:'Voldaan',partial:'Gedeeltelijk voldaan',missing:'Niet aangetoond',not_applicable:'Niet van toepassing',sources:'Vergelijk de bron met je essay',covered:'Correct weergegeven',distorted:'Bron verkeerd geïnterpreteerd',
      source:'Bewijs uit de bron',student:'Jouw tekst',learn:'Je volgende leerstappen',correction:'Correctie',development:'Werk je antwoord verder uit',optional:'Optionele oefening',why:'Waarom dit belangrijk is',
      example:'Voorbeeld om te bestuderen — niet automatisch ingevoegd',practice:'Probeer het zelf',check:'Controleer je redenering',next:'Herschrijf de betreffende passage in je essay en laat de tekst opnieuw controleren. De voorbeelden tonen een aanpak; ze zijn niet het enige juiste antwoord.',
      draft:'Deze versie bevat alleen taalcorrecties. De opdracht is nog niet volledig beantwoord: gebruik de leerstappen hierboven om de inhoud of opbouw zelf te herzien.',draftUnknown:'Deze versie bevat alleen taalcorrecties. Voeg de volledige opdracht toe om te controleren of de tekst de vraag beantwoordt.',reference:'Eisen aan het C2-essay — Cambridge English'},
    es:{title:'¿Responde tu ensayo a la tarea?',expected:'Qué pide la tarea',assumed:'Faltan las instrucciones de escritura. Esta revisión supone la tarea habitual de C2: resumir y evaluar dos textos.',
      answered:'Tarea respondida',partly_answered:'Tarea parcialmente respondida',not_answered:'Tarea no respondida',not_assessable:'No se puede evaluar la respuesta a la tarea',
      task_coverage:'Contenido solicitado',source_accuracy:'Interpretación correcta de las fuentes',evaluation:'Evaluación de los argumentos',own_position:'Tu postura fundamentada',organisation:'Organización',register:'Estilo y registro',
      met:'Cumplido',partial:'Parcialmente cumplido',missing:'No demostrado',not_applicable:'No aplicable',sources:'Compara la fuente con tu ensayo',covered:'Representado correctamente',distorted:'Fuente mal interpretada',
      source:'Evidencia de la fuente',student:'Tu texto',learn:'Tus próximos pasos de aprendizaje',correction:'Corrección',development:'Desarrolla tu respuesta',optional:'Práctica opcional',why:'Por qué importa',
      example:'Ejemplo para estudiar — no se inserta automáticamente',practice:'Inténtalo tú',check:'Comprueba tu razonamiento',next:'Reescribe el pasaje correspondiente en tu ensayo y vuelve a enviarlo. Los ejemplos muestran una posibilidad; no son la única respuesta válida.',
      draft:'Esta versión solo incorpora correcciones lingüísticas. La tarea aún no está plenamente respondida: utiliza los pasos anteriores para revisar tú mismo el contenido o la estructura.',draftUnknown:'Esta versión solo incorpora correcciones lingüísticas. Añade la tarea completa para comprobar si responde a la pregunta.',reference:'Requisitos del ensayo C2 — Cambridge English'}
  };
  function render(card,response,essay='',task='',language='en') {
    if(!card) return;
    card.replaceChildren();card.hidden=true;
    const draftNote=card.ownerDocument.getElementById('nextDraftTaskContext');
    if(draftNote){draftNote.replaceChildren();draftNote.hidden=true;}
    const r=response?.taskReview,c=COPY[language]||COPY.en;
    if(response?.schemaVersion!==2||!r||!['answered','partly_answered','not_answered','not_assessable'].includes(r.verdict)||
       !['explicit','assumed','missing'].includes(r.basis)||!r.expectedResponse||!r.explanation||!Array.isArray(r.checks)) return;
    const doc=card.ownerDocument,node=(tag,text)=>{const n=doc.createElement(tag);n.textContent=text;return n;};
    if(draftNote&&r.verdict!=='answered') {
      draftNote.append(node('p',r.verdict==='not_assessable'?c.draftUnknown:c.draft));draftNote.hidden=false;
    }
    const exact=(quote,original)=>typeof quote==='string'&&quote.trim().length>=8&&original.includes(quote);
    const heading=node('h2',c.title);heading.id='writingCoachTitle';heading.className='app-block__title';card.append(heading);
    const verdict=node('p',c[r.verdict]);verdict.className='coach-verdict';card.append(verdict);
    if(r.basis==='assumed') {const note=node('p',c.assumed);note.className='ec-context-warning';card.append(note);}
    card.append(node('h3',c.expected),node('p',r.expectedResponse),node('p',r.explanation));
    const list=doc.createElement('ul');list.className='coach-checks';
    for(const check of r.checks) {
      if(!['task_coverage','source_accuracy','evaluation','own_position','organisation','register'].includes(check?.requirement)||
         !['met','partial','missing','not_applicable'].includes(check.status)||!check.explanation||!Array.isArray(check.evidence)||
         check.evidence.some(q=>!exact(q,essay))||(['met','partial'].includes(check.status)&&!check.evidence.length)) continue;
      const item=doc.createElement('li');item.append(node('strong',`${c[check.requirement]} — ${c[check.status]}`),node('p',check.explanation));
      for(const q of check.evidence.slice(0,3)) item.append(node('blockquote',q));list.append(item);
    }
    card.append(list);
    const sources=(Array.isArray(response.sourceReview)?response.sourceReview:[]).filter(s=>exact(s?.sourceQuote,task)&&
      ['covered','partial','missing','distorted'].includes(s.coverage)&&s.explanation&&Array.isArray(s.essayEvidence)&&s.essayEvidence.every(q=>exact(q,essay)));
    if(sources.length) {
      const details=doc.createElement('details');details.append(node('summary',c.sources));
      details.open=sources.some(s=>s.coverage==='distorted');
      for(const source of sources) {
        const item=doc.createElement('div');item.className='coach-source';
        item.append(node('h4',`${c[source.coverage]}: ${source.point}`),node('strong',c.source),node('blockquote',source.sourceQuote));
        if(source.essayEvidence.length) item.append(node('strong',c.student));
        source.essayEvidence.forEach(q=>item.append(node('blockquote',q)));
        item.append(node('p',source.explanation));details.append(item);
      }
      card.append(details);
    }
    const points=(Array.isArray(response.learningPoints)?response.learningPoints:[]).filter(p=>exact(p?.example,essay)&&
      ['correction','development','optional'].includes(p.kind)&&p.issue&&p.explanation&&p.improvedExample&&p.practiceInstruction&&p.checkQuestion&&
      (!p.sourceQuote||exact(p.sourceQuote,task))).slice(0,3);
    if(points.length) {
      card.append(node('h3',c.learn));const steps=doc.createElement('ol');steps.className='coach-steps';
      for(const point of points) {
        const item=doc.createElement('li');item.className='app-box';
        item.append(node('h4',`${c[point.kind]}: ${point.issue}`),node('strong',c.student),node('blockquote',point.example));
        if(point.sourceQuote) item.append(node('strong',c.source),node('blockquote',point.sourceQuote));
        item.append(node('strong',c.why),node('p',point.explanation),node('strong',c.example),node('blockquote',point.improvedExample),
          node('strong',c.practice),node('p',point.practiceInstruction),node('strong',c.check),node('p',point.checkQuestion));
        steps.append(item);
      }
      card.append(steps,node('p',c.next));
    }
    if(r.taskType==='source_essay') {
      const link=node('a',c.reference);link.href='https://www.cambridgeenglish.org/exams-and-tests/qualifications/proficiency/format/';card.append(link);
    }
    card.hidden=false;
  }
  window.ECWritingCoach={render};
})();
