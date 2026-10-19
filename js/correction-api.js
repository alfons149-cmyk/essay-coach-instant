// Only allowlisted, content-free diagnostics may cross into UI errors/support reports.
(() => {
  const codes=new Set('INPUT TOO_LARGE_BODY TOO_LONG TOO_MANY_SENTENCES TOO_SHORT CONFIG AI_CONFIGURATION AI_SERVICE AI_RESPONSE AI_REFUSAL AI_FILTERED AI_CONNECTION TIMEOUT ASSESSMENT_INCOMPLETE UNSUITABLE_SAMPLE NOT_FOUND METHOD RATE_LIMITED AI_RATE_LIMITED AI_UNAVAILABLE NETWORK CLIENT_TIMEOUT CANCELLED INVALID_RESPONSE UI_ERROR HTTP_ERROR'.split(' '));
  const phases=new Set(['task','assessment','review']);
  const rules=new Set('UNSUPPORTED_TASK_STRUCTURE LENGTH_ONLY_COVERAGE EXISTING_SUPPORT OVERLIMIT_ADDITION TEACHING_EXAMPLE SURFACE_OMISSION CAPITALIZATION_AUDIT SOURCE_MEANING_EDIT EVIDENCE_GRANULARITY RESIDUAL_LANGUAGE_ERROR SENTENCE_COVERAGE UNEXPLAINED_CHANGE PUNCTUATION_AUDIT ORIGINAL_EVIDENCE UNNECESSARY_CORRECTION WORD_LENGTH TASK_CLASSIFICATION RESPONSE_CONSISTENCY'.split(' '));
  const outcomes=new Set('requesting valid validation_failed upstream_error unreadable_response refusal stop length content_filter unexpected task_recheck valid_reused_candidate classification_disagreement sent_to_review timeout connection_error'.split(' '));
  const fields=new Set('languageAudit checkedSentenceIds sentenceRepairs explanations corrections originalQuote replacementQuote punctuationChecks edits replacement sentenceInsights betterVersion learningPoints practiceInstruction issue improvedExample sourcePointId sourceQuote assessment criteria content communicative organisation language reason taskReview sourceReview sourceReviewById sourceReading sources keyPoints evidenceId evidenceIds sentenceId category'.split(' '));
  const n=value=>Number.isFinite(value)&&value>=0?Math.min(value,1e9):undefined;
  const phase=value=>phases.has(value)?value:'unknown';
  const field=value=>typeof value==='string'&&value.length<=160&&value.split(/[.\[\]]/).filter(Boolean).every(s=>fields.has(s)||/^\d{1,4}$/.test(s)||/^P\d{1,3}$/.test(s))?value:'unknown';
  function safeFailure(status,body,localCode) {
    const d=body?.diagnostics||{},report={httpStatus:Number.isInteger(status)&&status>=100&&status<=599?status:null,
      code:codes.has(localCode)?localCode:codes.has(body?.code)?body.code:'HTTP_ERROR',phase:phase(d.phase)};
    if(typeof body?.version==='string'&&/^\d{4}-\d{2}-\d{2}-coaching-v\d+\.\d+\.\d+(?:-[a-z]+)*$/.test(body.version))report.version=body.version;
    report.upstreamStatus=Number.isInteger(body?.upstreamStatus)&&body.upstreamStatus>=400&&body.upstreamStatus<=599?body.upstreamStatus:undefined;
    report.totalMs=n(d.totalMs);
    report.attempts=n(d.attempts);
    report.phaseAttempts=Object.fromEntries([...phases].filter(p=>n(d.phaseAttempts?.[p])!==undefined).map(p=>[p,n(d.phaseAttempts[p])]));
    report.phaseMs=Object.fromEntries([...phases].filter(p=>n(d.phaseMs?.[p])!==undefined).map(p=>[p,n(d.phaseMs[p])]));
    report.history=(Array.isArray(d.history)?d.history:[]).slice(0,12).map(h=>({phase:phase(h?.phase),attempt:n(h?.attempt),durationMs:n(h?.durationMs),providerMs:n(h?.providerMs),validationMs:n(h?.validationMs),
      upstreamStatus:Number.isInteger(h?.upstreamStatus)&&h.upstreamStatus>=400&&h.upstreamStatus<=599?h.upstreamStatus:undefined,outcome:outcomes.has(h?.outcome)?h.outcome:'unknown',checks:(Array.isArray(h?.checks)?h.checks:[]).slice(0,32).map(c=>({field:field(c?.field),rule:rules.has(c?.rule)?c.rule:'UNKNOWN'}))}));
    report.completions=(Array.isArray(d.completions)?d.completions:[]).slice(0,12).map(c=>({phase:phase(c?.phase),attempt:n(c?.attempt),finishReason:['stop','length','content_filter','unexpected'].includes(c?.finishReason)?c.finishReason:'unknown',promptTokens:n(c?.promptTokens),completionTokens:n(c?.completionTokens),maxCompletionTokens:n(c?.maxCompletionTokens)}));
    return report;
  }
  const failure=report=>Object.assign(new Error('Correction request failed'),{safeReport:report});
  async function request(url,payload,{signal,timeoutMs=190000,fetchImpl=fetch}={}) {
    const controller=new AbortController();let timedOut=false;
    const abort=()=>controller.abort();
    signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
    try {
      const response=await fetchImpl(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'omit',signal:controller.signal});
      let body;try{body=JSON.parse(await response.text());}catch(error){
        if(controller.signal.aborted)throw error;
        throw failure(safeFailure(response.status,null,response.ok?'INVALID_RESPONSE':undefined));
      }
      if(!response.ok)throw failure(safeFailure(response.status,body));
      if(body?.schemaVersion!==2||typeof body.nextDraft!=='string'||!body.nextDraft.trim()||!Array.isArray(body.edits)||body.diagnostics?.reviewCompleted!==true)
        throw failure(safeFailure(response.status,null,'INVALID_RESPONSE'));
      return body;
    } catch(error) {
      if(error?.safeReport)throw error;
      throw failure(safeFailure(null,null,timedOut?'CLIENT_TIMEOUT':signal?.aborted?'CANCELLED':'NETWORK'));
    } finally {clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  function message(report,language='en') {
    const copy={en:['Correction was not completed. No checked result is available.','The service is busy. Wait before trying again.','The request timed out. The server may still be processing it; avoid repeated submissions.','HTTP','Code','Phase'],
      nl:['De correctie is niet voltooid. Er is geen gecontroleerd resultaat beschikbaar.','De dienst is bezet. Wacht voordat je het opnieuw probeert.','De aanvraag duurde te lang. De server kan nog bezig zijn; verstuur de tekst niet herhaaldelijk.','HTTP','Code','Fase'],
      es:['La corrección no se ha completado. No hay un resultado verificado disponible.','El servicio está ocupado. Espera antes de volver a intentarlo.','La solicitud ha tardado demasiado. El servidor puede seguir procesándola; evita enviarla repetidamente.','HTTP','Código','Fase']}[language]||null;
    if(!copy)return message(report,'en');
    const extra=report.httpStatus===429||report.httpStatus===503||report.upstreamStatus===429||report.upstreamStatus===503?copy[1]:['TIMEOUT','CLIENT_TIMEOUT'].includes(report.code)?copy[2]:'';
    return `${copy[0]} ${extra} ${copy[3]}: ${report.httpStatus??'—'} · ${copy[4]}: ${report.code} · ${copy[5]}: ${report.phase}`;
  }
  window.ECCorrectionAPI={request,safeFailure,message};
})();
