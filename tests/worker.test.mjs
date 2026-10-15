import assert from 'node:assert/strict';
import worker,{numberSentences,responseSchema,validate,toClient,detectSignals} from '../apps/worker/src/worker.js';
const payload={essay:"Essay\r\nThe overarching theme of the two texts relates to cars and transportation.\r\nLiving abroad helps students develop their confidence. Students learns abroad.\r\nLiving abroad helps students develop their confidence.",task:'',level:'C1'};
const sentences=numberSentences(payload.essay);
const idFor=t=>sentences.find(s=>s.text===t).id;
const theme=idFor('The overarching theme of the two texts relates to cars and transportation.');
const incorrect=idFor('Students learns abroad.');
const repeated=idFor('Living abroad helps students develop their confidence.');
const lesson=id=>({category:'language',kind:'optional',evidenceId:id,sourceQuote:'',issue:'Practise subject and verb agreement.',explanation:'Identify the subject before choosing the verb.',improvedExample:'Students learn abroad.',practiceInstruction:'Write another plural-subject sentence.',checkQuestion:'Does your verb agree with the subject?'});
function valid(){return {sourceReview:[],taskReview:{taskType:'unclear',basis:'missing',verdict:'not_assessable',expectedResponse:'Provide the writing task to assess task achievement.',explanation:'Only language and organisation can be assessed.',checks:[{requirement:'task_coverage',status:'not_applicable',explanation:'Task not supplied.',evidenceIds:[]}]},learningPoints:[lesson(incorrect)],sampleSuitable:true,feedback:'Your argument is clear. Correct the agreement in the sentence about students. The task was not supplied, so content and communicative achievement cannot be assessed.',
 assessment:{taskSufficient:false,criteria:{
 content:{score:null,reason:'Task not supplied.',evidenceIds:[]},communicative:{score:null,reason:'Task not supplied.',evidenceIds:[]},
 organisation:{score:3,reason:'Ideas are linked but some repetition remains.',evidenceIds:[theme,repeated]},
 language:{score:4,reason:'Generally accurate, with one agreement error.',evidenceIds:[incorrect]}}},
 keyFocus:{action:'Use the plural verb with students.',evidenceId:incorrect,explanation:'Students needs learn, not learns.'},
 edits:[{kind:'correction',sentenceId:incorrect,replacement:'Students learn abroad.',reason:'Plural subject.'}],
 sentenceInsights:[{kind:'correction',sentenceId:incorrect,issue:'Subject–verb agreement',explanation:'Students is plural.',betterVersion:'Students learn abroad.',unit:1}],
 vocabularySuggestions:[{sentenceId:repeated,original:'develop their confidence',alternatives:['become more confident'],explanation:'An optional alternative with the same meaning.'}]};}
let checks=0;
async function test(name,f){await f();checks++;console.log('PASS',name);}
await test('sentence references recover exact original including CRLF',()=>{for(const s of sentences)assert.equal(payload.essay.slice(s.start,s.end),s.text);assert.equal(new Set(sentences.map(s=>s.id)).size,sentences.length);});
await test('curly quotes and whitespace preserved',()=>{const e='  A student’s confidence grows.\n\n  “Learning takes time.”';for(const s of numberSentences(e))assert.equal(e.slice(s.start,s.end),s.text);});
await test('missing task does not erase organisation/language/focus',()=>{const r=toClient(valid(),payload,sentences,1);assert.equal(r.assessment.criteria.organisation.score,3);assert.equal(r.assessment.criteria.language.score,4);assert.equal(r.assessment.criteria.content.score,null);assert(r.keyFocus.evidence);assert.equal(r.schemaVersion,2);});
await test('core missing data from screenshot rejected, not empty success',()=>{const d=valid();d.assessment.criteria.organisation={score:null,reason:'Logical structure.',evidenceIds:[]};d.assessment.criteria.language={score:null,reason:'Clear language.',evidenceIds:[]};d.keyFocus=null;assert(validate(d,payload,sentences).length>=3);});
await test('unknown references rejected',()=>{const d=valid();d.keyFocus.evidenceId='S999';d.assessment.criteria.language.evidenceIds=['S998'];assert(validate(d,payload,sentences).length>=2);});
await test('score 0 retained; score strings and out-of-range rejected',()=>{let d=valid();d.assessment.criteria.language.score=0;assert.equal(toClient(d,payload,sentences,1).assessment.criteria.language.score,0);d.assessment.criteria.language.score='4';assert(validate(d,payload,sentences).length);d.assessment.criteria.language.score=8;assert(validate(d,payload,sentences).length);});
await test('one correction preserves all other content',()=>assert.equal(toClient(valid(),payload,sentences,1).nextDraft,payload.essay.replace('Students learns','Students learn')));
await test('repeated sentence edited at its ID only',()=>{let d=valid();d.edits=[{kind:'correction',sentenceId:repeated,replacement:'Living abroad helps students become confident.',reason:'Test fixture.'}];d.sentenceInsights=[];let r=toClient(d,payload,sentences,1);assert.equal(r.nextDraft,payload.essay.replace('Living abroad helps students develop their confidence.','Living abroad helps students become confident.'));});
await test('optional changes not applied automatically',()=>{let d=valid();d.edits[0].kind='suggestion';d.sentenceInsights=[];assert.equal(toClient(d,payload,sentences,1).nextDraft,payload.essay);});
await test('zero edits allowed for accurate writing',()=>{let d=valid();d.edits=[];d.sentenceInsights=[];d.vocabularySuggestions=[];assert.equal(validate(d,payload,sentences).length,0);});
await test('vocabulary restored with exact context',()=>{let r=toClient(valid(),payload,sentences,1);assert.deepEqual(r.vocabularySuggestions['develop their confidence'],['become more confident']);assert(r.vocabularyDetails[0].example);});
await test('invented vocabulary quote rejected',()=>{let d=valid();d.vocabularySuggestions[0].original='invented words';assert(validate(d,payload,sentences).length);});
await test('course unit and quotation resolved',()=>{let r=toClient(valid(),payload,sentences,1);assert.equal(r.sentenceInsights[0].example,'Students learns abroad.');assert.equal(r.sentenceInsights[0].unit,1);let d=valid();d.sentenceInsights[0].unit=999;assert(validate(d,payload,sentences).length);});
await test('all structured object fields required, no additionalProperties',()=>{function walk(s){if(s.type==='object'){assert.equal(s.additionalProperties,false);assert.deepEqual(s.required,Object.keys(s.properties));for(const p of Object.values(s.properties))walk(p);}if(s.items)walk(s.items);if(s.anyOf)s.anyOf.forEach(walk);}const schema=responseSchema(sentences);walk(schema);assert(schema.$defs.sentenceId.enum.includes(theme));assert(!schema.$defs.sentenceId.enum.includes('S1'));});
const request=body=>new Request('https://worker.test/api/correct',{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}});
const env={OPENAI_API_KEY:'test-key-not-real'};
const completion=d=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(d)}}]}));
let calls=0,sent=[];
globalThis.fetch=async(_,options)=>{calls++;sent.push(JSON.parse(options.body));return completion(valid());};
await test('HTTP contract returns v2 shape with v5.5.2 version',async()=>{let r=await worker.fetch(request(payload),env);assert.equal(r.status,200);r=await r.json();assert.equal(r.version,'2026-10-15-coaching-v5.5.2');assert.equal(r.schemaVersion,2);assert.equal(r.diagnostics.attempts,2);assert.equal(r.diagnostics.reviewCompleted,true);assert.equal(sent[0].response_format.json_schema.strict,true);});
await test('invalid response triggers exactly one repair',async()=>{calls=0;globalThis.fetch=async()=>{calls++;let d=valid();if(calls===1){d.assessment.criteria.language.score=null;d.keyFocus.evidenceId='S999';}return completion(d);};const r=await worker.fetch(request(payload),env);assert.equal(r.status,200);assert.equal((await r.json()).diagnostics.attempts,3);assert.equal(calls,3);});
await test('twice-incomplete response rejected with diagnostic code',async()=>{calls=0;globalThis.fetch=async()=>{calls++;let d=valid();d.assessment.criteria.organisation.evidenceIds=[];return completion(d);};let r=await worker.fetch(request(payload),env);assert.equal(r.status,502);r=await r.json();assert.equal(r.code,'ASSESSMENT_INCOMPLETE');assert(r.diagnostics.issues.length);assert.equal(calls,3);});
await test('truncation can be repaired',async()=>{calls=0;globalThis.fetch=async()=>++calls===1?new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{'}}]})):completion(valid());const r=await worker.fetch(request(payload),env);assert.equal(r.status,200);assert.equal(calls,3);});
await test('upstream errors do not retry or leak body',async()=>{calls=0;globalThis.fetch=async()=>{calls++;return new Response('secret provider body',{status:429});};const r=await worker.fetch(request(payload),env);assert.equal(r.status,502);assert(!(await r.text()).includes('secret provider'));assert.equal(calls,1);});
await test('health, root, preflight, bad method and bad input',async()=>{for(const path of ['/','/api/health'])assert.equal((await worker.fetch(new Request('https://worker.test'+path),{})).status,200);assert.equal((await worker.fetch(new Request('https://worker.test/api/correct',{method:'OPTIONS'}),{})).status,204);assert.equal((await worker.fetch(new Request('https://worker.test/api/correct'),{})).status,405);assert.equal((await worker.fetch(request({essay:''}),env)).status,400);assert.equal((await worker.fetch(request(payload),{})).status,503);});
console.log(`${checks} tests passed. API responses mocked; no live AI evaluation performed.`);

await test('unsupported minor-error claim rejected',()=>{const d=valid();d.edits=[];d.sentenceInsights=[];d.assessment.criteria.language.reason='Generally accurate, with minor errors that do not impede understanding.';assert(validate(d,payload,sentences).some(x=>x.includes('Error claim')));});
await test('correction insight requires corresponding edit',()=>{const d=valid();d.edits=[];assert(validate(d,payload,sentences).some(x=>x.includes('matching correction')));});
await test('invented source quotations rejected',()=>{const d=valid();d.sourceReview=[{sourceQuote:'invented source',point:'A claim',coverage:'missing',essayEvidenceIds:[],explanation:'Not included.'}];assert(validate(d,payload,sentences).some(x=>x.includes('Source review')));});
await test('missing source idea can have no essay quotation',()=>{const p={...payload,task:'Products should last longer.'};const d=valid();d.sourceReview=[{sourceQuote:p.task,point:'Durability',coverage:'missing',essayEvidenceIds:[],explanation:'The draft does not discuss durability.'}];assert.equal(validate(d,p,sentences).length,0);d.sourceReview[0].coverage='covered';assert(validate(d,p,sentences).length);});
await test('reviewed result replaces provisional result',async()=>{calls=0;globalThis.fetch=async()=>{calls++;const d=valid();if(calls===2)d.feedback='Reviewed feedback with a checked agreement correction.';return completion(d);};const r=await worker.fetch(request(payload),env);const d=await r.json();assert.equal(d.feedback,'Reviewed feedback with a checked agreement correction.');assert.equal(d.diagnostics.reviewCompleted,true);assert.equal(calls,2);});
await test('failed review never returns unchecked draft as success',async()=>{calls=0;globalThis.fetch=async()=>++calls===1?completion(valid()):new Response('unavailable',{status:503});const r=await worker.fetch(request(payload),env);assert.equal(r.status,502);assert.equal(calls,2);});
await test('fragment correction preserves surrounding sentences and paragraphs',()=>{const essay='We can change our lifestyles.\nFor example, reducing disposable waste and increasing the use of reusable items.\nEducation also matters.';const ss=numberSentences(essay),d=valid();const id=ss[1].id;d.assessment.criteria.organisation.evidenceIds=[ss[0].id];d.assessment.criteria.language.evidenceIds=[id];d.keyFocus.evidenceId=id;d.learningPoints=[lesson(id)];d.edits=[{kind:'correction',sentenceId:id,replacement:'For example, we can reduce disposable waste and increase the use of reusable items.',reason:'Add a subject and finite verb to complete the sentence.'}];d.sentenceInsights=[];d.vocabularySuggestions=[];const r=toClient(d,{...payload,essay},ss,2);assert.equal(r.nextDraft,essay.replace(ss[1].text,d.edits[0].replacement));});
console.log(`${checks} total checks passed. Mocked model responses: these tests do not establish live assessment quality.`);

const {normaliseEdits}=await import('../apps/worker/src/worker.js');
await test('identical duplicate edit removed without changing correction',()=>{const d=valid();d.edits.push({...d.edits[0]});normaliseEdits(d,sentences);assert.equal(d.edits.length,1);assert.equal(validate(d,payload,sentences).length,0);});
await test('unchanged suggestion removed',()=>{const d=valid();d.edits.push({kind:'suggestion',sentenceId:theme,replacement:sentences.find(s=>s.id===theme).text,reason:'Already correct.'});normaliseEdits(d,sentences);assert.equal(d.edits.length,1);});
await test('conflicting replacements are not silently discarded',()=>{const d=valid();d.edits.push({...d.edits[0],replacement:'Students study abroad.'});normaliseEdits(d,sentences);assert.equal(d.edits.length,2);assert(validate(d,payload,sentences).some(x=>x.includes('conflicting edits')&&x.includes('edits[1]')));});
console.log(`${checks} total checks passed; model responses mocked.`);


const {normaliseEvidence,contextNotes,applyFeedbackPolicy,buildSignalHints}=await import('../apps/worker/src/worker.js');
await test('third assessment attempt still receives an independent review',async()=>{
 const bodies=[];
 globalThis.fetch=async(_,options)=>{bodies.push(JSON.parse(options.body));const d=valid();if(bodies.length<3)d.keyFocus.evidenceId='S999';return completion(d);};
 const response=await worker.fetch(request(payload),env), result=await response.json();
 assert.equal(response.status,200);assert.equal(result.diagnostics.attempts,4);
 assert.deepEqual(result.diagnostics.phaseAttempts,{assessment:3,review:1});assert.equal(result.diagnostics.reviewCompleted,true);
 assert.match(bodies[3].messages.at(-1).content,/Review the provisional assessment/);
 for(const body of bodies) {
  assert.equal(body.messages.filter(m=>m.role==='user').length,1);
  assert.equal(JSON.parse(body.messages.find(m=>m.role==='user').content).essay,payload.essay);
  assert(body.messages.filter(m=>m.role==='assistant').length<=1);
 }
});
await test('review repair has a turn after all three assessment attempts',async()=>{
 calls=0;globalThis.fetch=async()=>{calls++;const d=valid();if([1,2,4].includes(calls))d.keyFocus.evidenceId='S999';if(calls===5)d.feedback='Reviewed and repaired.';return completion(d);};
 const response=await worker.fetch(request(payload),env), result=await response.json();
 assert.equal(response.status,200);assert.equal(calls,5);assert.equal(result.feedback,'Reviewed and repaired.');
 assert.deepEqual(result.diagnostics.phaseAttempts,{assessment:3,review:2});
});
await test('exhausted review reports real defects and never returns provisional corrections',async()=>{
 calls=0;globalThis.fetch=async()=>{calls++;const d=valid();if(calls>1)d.edits=[];return completion(d);};
 const response=await worker.fetch(request(payload),env), result=await response.json();
 assert.equal(response.status,502);assert.equal(calls,3);assert.equal(result.diagnostics.phase,'review');
 assert.equal(result.diagnostics.reviewCompleted,false);assert(result.diagnostics.issues.some(s=>s.includes('matching correction')));
 assert(!Object.hasOwn(result,'nextDraft'));assert.deepEqual(result.diagnostics.phaseAttempts,{assessment:1,review:2});
});
await test('truncated review retries with the last complete assessment',async()=>{
 const bodies=[];globalThis.fetch=async(_,options)=>{bodies.push(JSON.parse(options.body));return bodies.length===2?new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{"broken":'}}]})):completion(valid());};
 const response=await worker.fetch(request(payload),env);
 assert.equal(response.status,200);assert.equal(bodies.length,3);
 assert.deepEqual(JSON.parse(bodies[2].messages.find(m=>m.role==='assistant').content),valid());
 assert.match(bodies[2].messages.at(-1).content,/incomplete/);
});
await test('excess real evidence is bounded without concealing invented evidence',()=>{
 const d=valid(),ids=sentences.filter(s=>s.text.length>=8).map(s=>s.id);
 d.assessment.criteria.organisation.evidenceIds=[ids[0],ids[0],...ids.slice(1)];
 const reason=d.assessment.criteria.organisation.reason,score=d.assessment.criteria.organisation.score;
 normaliseEvidence(d,sentences);assert.deepEqual(d.assessment.criteria.organisation.evidenceIds,ids.slice(0,3));
 assert.equal(d.assessment.criteria.organisation.reason,reason);assert.equal(d.assessment.criteria.organisation.score,score);
 d.assessment.criteria.organisation.evidenceIds=[...ids,'S999'];normaliseEvidence(d,sentences);
 assert(d.assessment.criteria.organisation.evidenceIds.includes('S999'));assert(validate(d,payload,sentences).length);
});
await test('observed excess evidence does not consume all assessment repair attempts',async()=>{
 calls=0;globalThis.fetch=async()=>{calls++;const d=valid();d.assessment.criteria.organisation.evidenceIds=sentences.filter(s=>s.text.length>=8).map(s=>s.id);return completion(d);};
 const response=await worker.fetch(request(payload),env);assert.equal(response.status,200);assert.equal(calls,2);
});
await test('length retries increase capacity once and preserve complete review candidate',async()=>{
 const bodies=[];globalThis.fetch=async(_,options)=>{bodies.push(JSON.parse(options.body));return bodies.length<3?new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{"private-fragment":'}}],usage:{completion_tokens:6000}})):completion(valid());};
 const r=await worker.fetch(request(payload),env),result=await r.json();assert.equal(r.status,200);
 assert.deepEqual(bodies.map(b=>b.max_completion_tokens),[6000,10000,10000,10000]);
 assert.match(bodies[1].messages.at(-1).content,/compact JSON/);
 assert(!JSON.stringify(bodies).includes('private-fragment'));
 assert.deepEqual(result.diagnostics.completions.map(c=>c.finishReason),['length','length','stop','stop']);
 assert.equal(result.diagnostics.completions[0].completionTokens,6000);
});
await test('repeated token exhaustion stays bounded and reports actual finish reason',async()=>{
 calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'secret-fragment'}}]}));};
 const r=await worker.fetch(request(payload),env),result=await r.json();assert.equal(r.status,502);assert.equal(calls,3);
 assert.equal(result.diagnostics.completions.length,3);assert(result.diagnostics.issues[0].includes('finish_reason=length'));
 assert(!JSON.stringify(result).includes('secret-fragment'));
});
for(const [reason,code,status] of [['content_filter','AI_FILTERED',422],['tool_calls','AI_RESPONSE',502],['private-unknown-reason','AI_RESPONSE',502]]) {
 await test(`provider finish reason ${reason} is not misreported as truncation`,async()=>{
  calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({choices:[{finish_reason:reason,message:{content:'private-output'}}]}));};
  const r=await worker.fetch(request(payload),env),result=await r.json();assert.equal(r.status,status);assert.equal(result.code,code);assert.equal(calls,1);
  assert(!JSON.stringify(result).includes('private-output'));assert(!JSON.stringify(result).includes('private-unknown-reason'));
 });
}
await test('missing choices and malformed envelope stop without wasteful retries',async()=>{
 for(const body of ['null','{}','not JSON']) {
  calls=0;globalThis.fetch=async()=>{calls++;return new Response(body);};
  const r=await worker.fetch(request(payload),env);assert.equal(r.status,502);assert.equal((await r.json()).code,'AI_RESPONSE');assert.equal(calls,1);
 }
});
await test('overall deadline limits calls even with an increased output budget',async()=>{
 const originalNow=Date.now;let elapsed=0;Date.now=()=>elapsed;
 try {
  calls=0;globalThis.fetch=async()=>{calls++;elapsed+=100000;return new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{'}}]}));};
  const r=await worker.fetch(request(payload),env),result=await r.json();assert.equal(r.status,504);assert.equal(result.code,'TIMEOUT');assert.equal(calls,2);
  assert.equal(result.diagnostics.attempts,2);
 } finally {Date.now=originalNow;}
});

function focusedFixture(essay,edits=[],language='nl') {
 const p={essay,task:'',level:'C1',feedbackLanguage:language},ss=numberSentences(essay),d=valid();
 const id=ss.find(s=>s.text.length>=8).id;
 d.assessment.criteria.organisation.evidenceIds=[id];d.assessment.criteria.language={score:4,reason:'Evidence of language control.',evidenceIds:[id]};
 d.keyFocus={action:'Review the time context.',evidenceId:id,explanation:'Use the stated context.'};
 d.learningPoints=[lesson(id)];
 d.feedback='Controleer de genoemde tijd en de gemarkeerde correctie.';
 d.edits=edits;d.sentenceInsights=[];d.vocabularySuggestions=[];
 return {p,ss,d};
}
await test('focused schema requests no clause analysis, timeline, forms or signal hints from the model',()=>{
 const schema=responseSchema(sentences);
 assert(!Object.hasOwn(schema.properties,'tenseAnalysis'));assert(!Object.hasOwn(schema.properties,'signalHints'));
 assert(!JSON.stringify(schema).includes('clauses'));assert(!JSON.stringify(schema).includes('timeFrame'));
 assert(schema.required.includes('assessment'));assert(schema.required.includes('edits'));
});
await test('obsolete malformed clause data cannot block or appear in a focused assessment',async()=>{
 const f=focusedFixture('Three days ago, I went home and eat a sandwich.',[{kind:'correction',sentenceId:'S1',replacement:'Three days ago, I went home and ate a sandwich.',reason:'Both actions belong to the same past event.'}]);
 f.d.tenseAnalysis=[{sentenceId:'S1',clauses:[{quote:'I went home and ate a sandwich',form:'invented-form',timeFrame:'wrong'}]}];
 calls=0;globalThis.fetch=async()=>{calls++;return completion(structuredClone(f.d));};
 const response=await worker.fetch(request(f.p),env),result=await response.json();
 assert.equal(response.status,200);assert.equal(calls,2);assert.equal(result.feedbackMode,'focused');assert.deepEqual(result.tenseAnalysis,[]);
 assert.equal(result.nextDraft,'Three days ago, I went home and ate a sandwich.');
 assert(!JSON.stringify(result).includes('invented-form'));assert(!JSON.stringify(result).includes('clauses'));
 assert.equal(result.diagnostics.reviewCompleted,true);
});
await test('focused mode still rejects fabricated correction references',async()=>{
 calls=0;globalThis.fetch=async()=>{calls++;const d=valid();d.edits[0].sentenceId='S999';return completion(d);};
 const response=await worker.fetch(request(payload),env),result=await response.json();
 assert.equal(response.status,502);assert.equal(calls,3);assert(result.diagnostics.issues.some(s=>s.includes('sentenceId')));assert(!result.nextDraft);
});
for(const language of ['nl','es','en']) await test(`morning guidance remains compulsory in focused ${language} output`,()=>{
 const f=focusedFixture('This morning I have had a coffee.',[],language);
 f.d.feedback='This sentence is completely correct.';
 const result=toClient(f.d,f.p,f.ss,2);
 assert(result.feedback.includes('This morning I had a coffee.'));assert(!result.feedback.includes('completely correct'));
 assert.deepEqual(result.tenseAnalysis,[]);assert.equal(result.contextNotes.length,1);
 assert.equal(result.signalHints[0].explanation,result.contextNotes[0].explanation);assert.equal(result.nextDraft,f.p.essay);
});
await test('unsupported perfect-to-past morning edit is still rejected',()=>{
 const f=focusedFixture('This morning I have had a coffee.',[{kind:'correction',sentenceId:'S1',replacement:'This morning I had a coffee.',reason:'Morning always means past.'}]);
 assert(validate(f.d,f.p,f.ss).some(s=>s.includes('without explicit finished-time evidence')));
});
await test('explicitly finished morning permits past correction',()=>{
 const f=focusedFixture('This morning I have had a coffee. It is now evening.',[{kind:'correction',sentenceId:'S1',replacement:'This morning I had a coffee.',reason:'The following sentence closes the morning.'}]);
 const result=toClient(f.d,f.p,f.ss,2);assert.deepEqual(result.contextNotes,[]);assert(result.nextDraft.startsWith('This morning I had a coffee.'));
});
await test('as soon as preserves the original and gives a fixed brief reminder without labels',()=>{
 const f=focusedFixture('I will call you as soon as I know our plans.');
 const result=toClient(f.d,f.p,f.ss,2);assert.equal(result.nextDraft,f.p.essay);
 assert.match(result.signalHints[0].explanation,/present-vorm/);assert(!result.signalHints[0].explanation.includes('begint'));
 assert(!Object.hasOwn(result.signalHints[0],'forms'));assert(!Object.hasOwn(result.signalHints[0],'status'));
});
await test('signal reminders are bounded, literal, prioritise morning context and do not invent a timeline',()=>{
 const essay='I left yesterday. Tomorrow I am visiting friends. I have known her since 2010. I work on Fridays. This morning I have had a coffee.';
 const ss=numberSentences(essay),hints=buildSignalHints({essay,feedbackLanguage:'es'},ss);
 assert.equal(hints.length,3);assert(hints.some(h=>h.example.includes('This morning')));
 for(const hint of hints){assert(hint.signals.every(signal=>hint.example.includes(signal)));assert(!('timeFrame' in hint));}
 assert.deepEqual(buildSignalHints({essay:'Learning languages matters.'},numberSentences('Learning languages matters.')),[]);
});
await test('normal assessment without signal words succeeds and needs no teaching entries',async()=>{
 const f=focusedFixture('Learning languages matters.');calls=0;const bodies=[];
 globalThis.fetch=async(_,o)=>{calls++;bodies.push(JSON.parse(o.body));return completion(structuredClone(f.d));};
 const response=await worker.fetch(request(f.p),env),result=await response.json();assert.equal(response.status,200);assert.equal(calls,2);
 assert.deepEqual(result.signalHints,[]);assert(!bodies[0].messages[1].content.includes('tenseTeachingTargets'));
 assert.match(bodies[0].messages[0].content,/FOCUSED FEEDBACK/);
});
await test('captured invented optional rewrites remain excluded',()=>{
 const f=focusedFixture('I have written three essays today.');
 f.d.edits=[{kind:'suggestion',sentenceId:'S1',replacement:'I have written three essays today, which has helped me stay on track.',reason:'Add context.'}];
 f.d.sentenceInsights=[{kind:'suggestion',sentenceId:'S1',issue:'Practice',explanation:'Which detail could you support from experience?',betterVersion:'Invented experience.',unit:9}];
 const result=toClient(f.d,f.p,f.ss,2);assert.deepEqual(result.edits,[]);assert.equal(result.sentenceInsights[0].betterVersion,'');assert.equal(result.nextDraft,f.p.essay);
});
console.log(`${checks} focused-mode and core checks passed; model calls mocked.`);

const {readFile}=await import('node:fs/promises');
const {correctionPreservations}=await import('../apps/worker/src/worker.js');
const falseCorrections=JSON.parse(await readFile(new URL('./fixtures/tense-v54-false-corrections.json',import.meta.url),'utf8'));
for(const captured of falseCorrections) await test(`captured v5.4 ${captured.feedbackLanguage} edit is ${captured.expected}ed: ${captured.from}`,()=>{
 const f=focusedFixture(captured.from,[{kind:'correction',sentenceId:'S1',replacement:captured.to,reason:captured.reason}],captured.feedbackLanguage);
 const issues=validate(f.d,f.p,f.ss);
 if(captured.expected==='reject') {
  assert(issues.some(s=>s.includes('unsupported correction of protected phrase')));
  assert.throws(()=>toClient(f.d,f.p,f.ss,2),/unsupported correction/);
 } else {
  assert.deepEqual(issues,[]);assert.equal(toClient(f.d,f.p,f.ss,2).nextDraft,captured.to);
 }
});
await test('protection generalises to past reading and repeated dynamic activity, including contractions',()=>{
 for(const [original,replacement] of [
  ['She read the newspaper yesterday.','She studied the newspaper yesterday.'],
  ['They read their books three days ago.','They had read their books three days ago.'],
  ["This month we've been working every evening.",'This month we have worked every evening.'],
  ['This week she’s been practising daily.','This week she has practised daily.']
 ]) {
  const f=focusedFixture(original,[{kind:'correction',sentenceId:'S1',replacement,reason:'Unsupported tense preference.'}]);
  assert(validate(f.d,f.p,f.ss).some(s=>s.includes('protected phrase')),original);
 }
});
await test('guards do not lock stative errors, misspellings, wrong agreement or explicitly closed periods',()=>{
 for(const [original,replacement] of [
  ['This week I have been knowing the answer every day.','This week I have known the answer every day.'],
  ['I readed my book last night.','I read my book last night.'],
  ['This week she have been studying every day.','This week she has been studying every day.'],
  ['Last year I have been working every day, unlike this week.','Last year I worked every day, unlike this week.']
 ]) {
  const f=focusedFixture(original,[{kind:'correction',sentenceId:'S1',replacement,reason:'Repair a demonstrable error.'}]);
  assert.deepEqual(correctionPreservations(f.ss),[],original);assert.deepEqual(validate(f.d,f.p,f.ss),[]);
 }
});
await test('other errors in the same sentence can be fixed without changing protected verbs',()=>{
 for(const [original,replacement] of [
  ['I read a books last night.','I read a book last night.'],
  ['This week I have been studying every day, but my friend study only on Fridays.','This week I have been studying every day, but my friend studies only on Fridays.'],
  ["This week I've been studying every day, but he study less.",'This week I have been studying every day, but he studies less.']
 ]) {
  const f=focusedFixture(original,[{kind:'correction',sentenceId:'S1',replacement,reason:'Correct agreement outside the valid verb phrase.'}]);
  assert(correctionPreservations(f.ss).length);assert.deepEqual(validate(f.d,f.p,f.ss),[]);
  assert.equal(toClient(f.d,f.p,f.ss,2).nextDraft,replacement);
 }
});
await test('two protected occurrences cannot be satisfied by leaving only one unchanged',()=>{
 const f=focusedFixture('I read my book yesterday and I read my textbook last night.',[{kind:'correction',sentenceId:'S1',replacement:'I read my book yesterday and I studied my textbook last night.',reason:'False tense correction.'}]);
 assert(validate(f.d,f.p,f.ss).some(s=>s.includes('protected phrase')));
});

function preservationFixture(language='nl') {
 const essay='I will be taking an exam later today, so I read my textbook last night. I usually study on Fridays, but this week I have been studying every day. Three days ago, I went home and eat a sandwich.';
 const f=focusedFixture(essay,[],language);
 f.d.edits=[{kind:'correction',sentenceId:'S3',replacement:'Three days ago, I went home and ate a sandwich.',reason:'Use ate for the coordinated past action.'}];
 const bad=structuredClone(f.d);
 bad.edits.unshift(...falseCorrections.filter(e=>e.expected==='reject').map((e,index)=>({kind:'correction',sentenceId:`S${index+1}`,replacement:e.to,reason:e.reason})));
 bad.feedback="The past of read is studied. The continuous is unnecessary.";
 bad.assessment.criteria.language.reason="Read must be changed to studied.";
 bad.sentenceInsights=[{kind:'correction',sentenceId:'S1',issue:'False tense claim',explanation:'The past of read is studied.',betterVersion:bad.edits[0].replacement,unit:12}];
 f.d.feedback='The two original time choices are preserved. Correct eat to ate.';
 f.d.assessment.criteria.language.reason='Correct the coordinated past action: eat to ate.';
 return {...f,bad};
}
for(const language of ['nl','es','en']) await test(`reassessment removes both false corrections and dependent criticism in ${language}`,async()=>{
 const f=preservationFixture(language),bodies=[];
 globalThis.fetch=async(_,options)=>{bodies.push(JSON.parse(options.body));return completion(structuredClone(bodies.length===1?f.bad:f.d));};
 const response=await worker.fetch(request(f.p),env),result=await response.json();
 assert.equal(response.status,200);assert.equal(bodies.length,3);assert.equal(result.diagnostics.reviewCompleted,true);
 assert.equal(result.nextDraft,f.p.essay.replace('and eat','and ate'));assert.equal(result.edits.length,1);
 assert.equal(result.assessment.criteria.language.reason,f.d.assessment.criteria.language.reason);
 assert(!JSON.stringify(result).includes('studied'));assert.deepEqual(result.sentenceInsights,[]);
 assert.match(bodies[1].messages.at(-1).content,/dependent criticism, score penalties and insights/);
 const input=JSON.parse(bodies[0].messages.find(m=>m.role==='user').content);
 assert.equal(input.correctionPreservations.length,2);assert.equal(input.essay,f.p.essay);
});
await test('review cannot reintroduce either false correction; its repair preserves the real error fix',async()=>{
 const f=preservationFixture();calls=0;
 globalThis.fetch=async()=>completion(structuredClone(++calls===2?f.bad:f.d));
 const response=await worker.fetch(request(f.p),env),result=await response.json();
 assert.equal(response.status,200);assert.deepEqual(result.diagnostics.phaseAttempts,{assessment:1,review:2});
 assert.equal(result.nextDraft,f.p.essay.replace('and eat','and ate'));assert.equal(result.edits.length,1);
});
for(const phase of ['assessment','review']) await test(`persistent false corrections during ${phase} never reach the corrected draft`,async()=>{
 const f=preservationFixture();calls=0;
 globalThis.fetch=async()=>completion(structuredClone(++calls===1&&phase==='review'?f.d:f.bad));
 const response=await worker.fetch(request(f.p),env),result=await response.json();
 assert.equal(response.status,502);assert.equal(calls,3);assert.equal(result.code,'ASSESSMENT_INCOMPLETE');
 assert.equal(result.diagnostics.phase,phase);assert.equal(result.diagnostics.reviewCompleted,false);
 assert(result.diagnostics.issues.some(s=>s.includes('protected phrase')));assert(!Object.hasOwn(result,'nextDraft'));
});
console.log(`${checks} core and correction-preservation checks passed; model calls mocked.`);

for(const language of ['en','nl','es']) await test(`all morning teaching categories retain the context condition without invented events (${language})`,()=>{
 for(const category of ['task_response','organisation','style','language']) {
  const f=focusedFixture('This morning I have had a coffee.',[],language);
  Object.assign(f.d.learningPoints[0],{category,kind:'development',sourceQuote:'',issue:'Add detail.',
   improvedExample:'This morning I have had a coffee and checked my emails before leaving home.'});
  f.d.assessment.criteria.language.reason='The sentence is completely correct.';
  const result=toClient(f.d,f.p,f.ss,2),point=result.learningPoints[0];
  assert.equal(point.category,'language');assert.equal(point.kind,'optional');
  assert.equal(point.improvedExample,'If the morning is over: “This morning I had a coffee.”');
  assert(!JSON.stringify(result).includes('checked my emails'));assert(!JSON.stringify(result).includes('completely correct'));
  assert.equal(result.assessment.criteria.language.reason,result.contextNotes[0].explanation);assert.equal(result.nextDraft,f.p.essay);
 }
});
await test('morning policy preserves real corrections and their explanations',()=>{
 const essay='This morning I have had an coffee.',replacement='This morning I have had a coffee.';
 const f=focusedFixture(essay,[{kind:'correction',sentenceId:'S1',replacement,reason:'Use a before the consonant sound in coffee.'}]);
 Object.assign(f.d.learningPoints[0],{category:'language',kind:'correction',improvedExample:replacement});
 const reason=f.d.assessment.criteria.language.reason,result=toClient(f.d,f.p,f.ss,2);
 assert.equal(result.edits.length,1);assert.equal(result.learningPoints[0].kind,'correction');
 assert.equal(result.nextDraft,replacement);assert.equal(result.assessment.criteria.language.reason,reason);
});
console.log(`${checks} Worker checks passed; model calls mocked.`);
