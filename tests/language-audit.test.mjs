import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker,{numberSentences,punctuationCandidates,reviewSchema,languageAuditIssues,modelConfiguration,normaliseCoaching,validate,auditRepairContext} from '../apps/worker/src/worker.js';
const cases=JSON.parse(await readFile(new URL('./fixtures/language-audit-cases.json',import.meta.url),'utf8'));
const originalFetch=globalThis.fetch;
let checks=0;
async function test(name,fn){await fn();checks++;console.log('PASS',name);}
function sample(input) {
 const ss=numberSentences(input.essay),ids=ss.map(s=>s.id),edits=[];
 for(const s of ss){
  const points=input.corrections.filter(p=>p.sentenceId===s.id);let replacement=s.text;
  for(const p of [...points].sort((a,b)=>s.text.indexOf(b.originalQuote)-s.text.indexOf(a.originalQuote)))replacement=replacement.replace(p.originalQuote,p.replacementQuote);
  if(points.length)edits.push({kind:'correction',sentenceId:s.id,replacement,reason:points.map(p=>p.explanation).join(' ')});
 }
 return {sampleSuitable:true,feedback:'The ideas are relevant. Use the concrete corrections and support your main point.',
  assessment:{taskSufficient:true,criteria:Object.fromEntries(['content','communicative','organisation','language'].map(k=>[k,{score:3,reason:'A limited practice assessment based on the supplied writing.',evidenceIds:[ids[0]]}]))},
  keyFocus:{action:'Support the main idea.',evidenceId:ids[0],explanation:'Develop the reason.'},
  taskReview:{taskType:'other',basis:'explicit',verdict:'partly_answered',expectedResponse:input.task,explanation:'Assess the actual supplied task.',checks:[{requirement:'task_coverage',status:'partial',explanation:'The topic is addressed briefly.',evidenceIds:[ids[0]]}]},
  sourceReview:[],learningPoints:[{category:'task_response',kind:'development',evidenceId:ids[0],sourceQuote:'',issue:'Develop the reason.',explanation:'Connect the claim and its reason.',improvedExample:ss[0].text,practiceInstruction:'Add one supporting reason of your own.',checkQuestion:'Does the reason support your claim?'}],edits,sentenceInsights:[],vocabularySuggestions:[],
  languageAudit:{checkedSentenceIds:ids,corrections:structuredClone(input.corrections),punctuationChecks:Object.fromEntries(punctuationCandidates(ss).map((c,i)=>[c.id,{decision:input.decisions[i]||'valid',explanation:'Check the actual linking or concessive function.'}]))}};
}
const req=input=>new Request('https://worker.test/api/correct',{method:'POST',body:JSON.stringify({...input,feedbackLanguage:input.feedbackLanguage||'en'})});
const completion=d=>new Response(JSON.stringify({model:'gpt-5.4',usage:{completion_tokens:500},choices:[{finish_reason:'stop',message:{content:JSON.stringify(d)}}]}));
const env={OPENAI_API_KEY:'mock-key-never-disclose',OPENAI_MODEL:'gpt-5.4'};
for(const input of cases)await test('exact reconstruction and coverage: '+input.name,()=>assert.deepEqual(languageAuditIssues(sample(input),numberSentences(input.essay)),[]));
await test('strict review schema includes short complete sentences',()=>{
 const ss=numberSentences('He go. I agree.'),schema=reviewSchema(ss);
 function walk(s){if(s.type==='object'){assert.equal(s.additionalProperties,false);assert.deepEqual(s.required,Object.keys(s.properties));Object.values(s.properties).forEach(walk);}if(s.items)walk(s.items);}
 walk(schema);assert.equal(Object.keys(schema.properties)[0],'languageAudit');assert.deepEqual(schema.$defs.sentenceId.enum,['S1','S2']);assert.equal(schema.properties.languageAudit.properties.checkedSentenceIds.minItems,2);
});
await test('candidate scan generalises and does not rewrite correct concessive however',()=>{
 assert.deepEqual(punctuationCandidates(numberSentences(cases[0].essay)).map(c=>c.marker.toLowerCase()),['therefore','however']);
 const d=sample(cases[2]);assert.equal(d.languageAudit.punctuationChecks.P1.decision,'valid');assert.deepEqual(d.edits,[]);
 assert.deepEqual(punctuationCandidates(numberSentences('However, we agreed. The costs rose; therefore, we waited.')),[]);
});
await test('missing duplicate or invented coverage is rejected on correct writing',()=>{
 for(const change of [a=>a.checkedSentenceIds.pop(),a=>a.checkedSentenceIds[0]=a.checkedSentenceIds[1],a=>a.checkedSentenceIds[0]='S999']){
  const d=sample(cases[2]);change(d.languageAudit);assert(languageAuditIssues(d,numberSentences(cases[2].essay)).some(s=>s.includes('checkedSentenceIds')));
 }
 assert(languageAuditIssues({},numberSentences(cases[2].essay))[0].startsWith('languageAudit:'));
});
await test('invented quotations overlapping evidence and extra rewrites are rejected',()=>{
 const ss=numberSentences(cases[0].essay);let d=sample(cases[0]);d.languageAudit.corrections[0].originalQuote='university have';assert(languageAuditIssues(d,ss).some(s=>s.includes('originalQuote')));
 d=sample(cases[0]);d.languageAudit.corrections.push({...d.languageAudit.corrections[0],replacementQuote:'university needed'});assert(languageAuditIssues(d,ss).some(s=>s.includes('conflict')));
 d=sample(cases[0]);d.edits[0].replacement+=' It will boost the economy.';assert(languageAuditIssues(d,ss).some(s=>s.includes('EVERY change')));
});
await test('style and source interpretation are not necessary language categories',()=>{
 for(const category of ['style','source_interpretation']){const d=sample(cases[0]);d.languageAudit.corrections[0].category=category;assert(languageAuditIssues(d,numberSentences(cases[0].essay)).some(s=>s.includes('necessary language category')));}
});
await test('punctuation decisions require evidence and may preserve uncertain constructions',()=>{
 let d=sample(cases[0]);d.languageAudit.corrections.pop();d.edits.pop();assert(languageAuditIssues(d,numberSentences(cases[0].essay)).some(s=>s.includes('matching punctuation evidence')));
 d=sample(cases[0]);delete d.languageAudit.punctuationChecks.P2;assert(languageAuditIssues(d,numberSentences(cases[0].essay)).some(s=>s.includes('punctuationChecks.P2')));
 d=sample(cases[0]);d.languageAudit.punctuationChecks.P2={decision:'context_needed',explanation:'Ask about the concessive meaning instead of automatically changing it.'};assert.deepEqual(languageAuditIssues(d,numberSentences(cases[0].essay)),[]);
});
await test('repeated quotations need uniquely identifying context',()=>{
 const input={...cases[0],essay:'The student read and read again.',corrections:[{sentenceId:'S1',category:'grammar',originalQuote:'read',replacementQuote:'reads',explanation:'Ambiguous test evidence.'}],decisions:[]};assert(languageAuditIssues(sample(input),numberSentences(input.essay)).some(s=>s.includes('exactly once')));
});
for(const feedbackLanguage of ['en','nl','es'])await test('review repairs a first-pass omission with no mechanical marker rewrite: '+feedbackLanguage,async()=>{
 const input={...cases[0],feedbackLanguage},bodies=[];
 globalThis.fetch=async(_,o)=>{bodies.push(JSON.parse(o.body));const d=sample(input);if(bodies.length===1){d.edits.pop();delete d.languageAudit;}return completion(d);};
 const r=await worker.fetch(req(input),env),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert.equal(bodies.length,2);
 assert(d.nextDraft.includes('therefore, affordable'));assert(d.nextDraft.includes('However convenient cars may be'));assert(d.nextDraft.includes(', for students need'));
 assert.equal(d.languageAudit.checkedSentenceIds.length,4);assert.equal(d.diagnostics.model,'gpt-5.4');assert.equal(d.diagnostics.completions[1].resolvedModel,'gpt-5.4');assert(!JSON.stringify(d).includes(env.OPENAI_API_KEY));
 assert(bodies[1].response_format.json_schema.schema.required.includes('languageAudit'));assert.match(bodies[1].messages[0].content,/Read EVERY original sentence/);
});
await test('review repair has precise phase field check history and measured time accounting',async()=>{
 const oldNow=Date.now;let elapsed=0,calls=0;Date.now=()=>elapsed;
 try{
  globalThis.fetch=async()=>{calls++;elapsed+=calls===1?7000:calls===2?11000:5000;const d=sample(cases[0]);if(calls<3)delete d.languageAudit;return completion(d);};
  const r=await worker.fetch(req(cases[0]),env),d=await r.json();assert.equal(r.status,200);assert.deepEqual(d.diagnostics.phaseAttempts,{assessment:1,review:2});assert.deepEqual(d.diagnostics.phaseMs,{assessment:7000,review:16000});assert.equal(d.diagnostics.totalMs,23000);
  assert.equal(d.diagnostics.history[0].providerMs,7000);assert.equal(d.diagnostics.repairAttempts.review,1);assert.equal(d.diagnostics.history[1].outcome,'validation_failed');assert.equal(d.diagnostics.history[1].checks[0].field,'languageAudit');assert.equal(d.diagnostics.history[1].checks[0].phase,'review');
  console.log('SYNTHETIC TIMING',JSON.stringify({totalMs:d.diagnostics.totalMs,phaseMs:d.diagnostics.phaseMs}));
 }finally{Date.now=oldNow;}
});
await test('persistent missing audit yields no unchecked draft',async()=>{
 globalThis.fetch=async()=>{const d=sample(cases[0]);delete d.languageAudit;return completion(d);};const r=await worker.fetch(req(cases[0]),env),d=await r.json();assert.equal(r.status,502);assert.equal(d.diagnostics.phase,'review');assert.equal(d.diagnostics.reviewCompleted,false);assert(!d.nextDraft);assert(d.diagnostics.history.at(-1).checks.some(c=>c.field==='languageAudit'));
});
await test('upstream errors preserve timings without private provider messages',async()=>{
 const oldNow=Date.now;let now=0;Date.now=()=>now;
 try{globalThis.fetch=async()=>{now+=42;return new Response('private error '+env.OPENAI_API_KEY,{status:400});};const r=await worker.fetch(req(cases[0]),env),d=await r.json();assert.equal(r.status,502);assert.equal(d.code,'AI_CONFIGURATION');assert.equal(d.diagnostics.history[0].durationMs,42);assert.equal(d.diagnostics.history[0].outcome,'upstream_error');assert(!JSON.stringify(d).includes(env.OPENAI_API_KEY));assert(!JSON.stringify(d).includes('private error'));}finally{Date.now=oldNow;}
});
await test('health reports model identifier source and key presence only',async()=>{
 const r=await worker.fetch(new Request('https://worker.test/api/health'),env),d=await r.json();assert.equal(d.model,'gpt-5.4');assert.equal(d.modelSource,'OPENAI_MODEL');assert.equal(d.apiKeyConfigured,true);assert(!JSON.stringify(d).includes(env.OPENAI_API_KEY));assert.equal(modelConfiguration({OPENAI_MODEL:'sk-not-a-model-secret'}).model,null);assert.equal(modelConfiguration({}).model,'gpt-4o-mini');
});
await test('short complete sentences reach both assessment and review',async()=>{
 const input={...cases[0],essay:'He go.',corrections:[{sentenceId:'S1',category:'grammar',originalQuote:'He go',replacementQuote:'He goes',explanation:'He takes goes in the present simple.'}],decisions:[]};globalThis.fetch=async()=>completion(sample(input));const r=await worker.fetch(req(input),env),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert.equal(d.nextDraft,'He goes.');
});
await test('reported however omission can be caught by review without a hardcoded sentence rewrite',async()=>{
 const input={...cases[0],essay:'The challenge is even more significant for single parents; however effective budgeting and time management skills will be crucial if you plan to homeschool.',corrections:[{sentenceId:'S1',category:'punctuation',originalQuote:'however effective',replacementQuote:'however, effective',explanation:'The linking adverb however needs a following comma here.'}],decisions:['correction']};let calls=0;
 globalThis.fetch=async()=>{const d=sample(input);if(++calls===1){d.edits=[];delete d.languageAudit;}return completion(d);};const r=await worker.fetch(req(input),env),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert(d.nextDraft.includes('; however, effective'));assert.equal(calls,2);
});
await test('valid and uncertain punctuation decisions cannot contradict their automatic edit',()=>{
 for(const decision of ['valid','context_needed']){const d=sample(cases[0]);d.languageAudit.punctuationChecks.P1.decision=decision;assert(languageAuditIssues(d,numberSentences(cases[0].essay)).some(s=>s.includes('contradicts an automatic punctuation correction')));}
});
await test('known linguistic disagreement goes directly to independent review with original evidence',async()=>{
 const bodies=[];globalThis.fetch=async(_,o)=>{bodies.push(JSON.parse(o.body));const d=sample(cases[0]);if(bodies.length===1){delete d.languageAudit;d.edits.push({kind:'correction',sentenceId:'S3',replacement:'The library stays open late, because students need a quiet place to work.',reason:'For cannot introduce a reason.'});}return completion(d);};
 const r=await worker.fetch(req(cases[0]),env),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert.equal(bodies.length,2);assert.deepEqual(d.diagnostics.phaseAttempts,{assessment:1,review:1});assert.equal(d.diagnostics.history[0].outcome,'sent_to_review');assert.equal(d.diagnostics.history[0].checks[0].rule,'UNNECESSARY_CORRECTION');const input=JSON.parse(bodies[1].messages.find(m=>m.role==='user').content);assert.equal(input.essay,cases[0].essay);assert(input.assessmentDefects.length);assert(d.nextDraft.includes(', for students need'));
});
await test('more than eight erroneous sentences fit the expanded edit budget',async()=>{
 const essay=Array.from({length:10},(_,i)=>'Student '+(i+1)+' need support.').join('\n'),input={...cases[0],essay,decisions:[],corrections:numberSentences(essay).map(s=>({sentenceId:s.id,category:'grammar',originalQuote:s.text,replacementQuote:s.text.replace(' need ',' needs '),explanation:'The singular subject requires needs.'}))};globalThis.fetch=async()=>completion(sample(input));const r=await worker.fetch(req(input),env),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert.equal(d.edits.length,10);assert(!d.nextDraft.includes(' need '));
});
await test('overall task verdict is derived conservatively without changing findings scores or explanations',()=>{
 for(const status of ['partial','missing']) {
  const d=sample(cases[2]);d.taskReview.verdict='answered';d.taskReview.checks[0].status=status;
  const before=structuredClone(d),changes=[];normaliseCoaching(d,numberSentences(cases[2].essay),changes);
  assert.equal(d.taskReview.verdict,status==='partial'?'partly_answered':'not_answered');
  assert.deepEqual(d.taskReview.checks,before.taskReview.checks);assert.deepEqual(d.assessment,before.assessment);assert.equal(d.feedback,before.feedback);assert.equal(changes[0].field,'taskReview.verdict');
 }
 const d=sample(cases[2]);d.taskReview.verdict='answered';d.taskReview.checks[0].status='not_a_status';normaliseCoaching(d,numberSentences(cases[2].essay));assert.equal(d.taskReview.verdict,'answered');assert(validate(d,cases[2],numberSentences(cases[2].essay)).length);
});
await test('inconsistent verdict alone causes no extra AI retry and its normalization is visible',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;const d=sample(cases[2]);d.taskReview.verdict='answered';return completion(d);};
 const r=await worker.fetch(req(cases[2]),env),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert.equal(calls,2);assert.equal(d.taskReview.verdict,'partly_answered');assert.equal(d.nextDraft,cases[2].essay);assert.equal(d.diagnostics.history[1].normalisations[0].to,'partly_answered');
});
await test('correction insight cannot teach a different replacement from its actual edit',()=>{
 const d=sample(cases[0]);d.sentenceInsights=[{kind:'correction',sentenceId:'S1',issue:'Agreement',explanation:'Singular subject.',betterVersion:'Our university demands a sophisticated transport strategy.',unit:1}];assert(validate(d,cases[0],numberSentences(cases[0].essay)).some(s=>s.includes('identical replacement')));
});
// Reproduce the reported failure shapes; these are synthetic replies, not the unavailable live JSON.
function brokenAudit(kind) {
 const d=sample(cases[3]);
 if(kind==='marker') d.languageAudit.corrections[3].category='grammar';
 if(kind==='overlap') {
  d.languageAudit.corrections.push({...d.languageAudit.corrections[3],originalQuote:'For example',replacementQuote:'For example;'});
  d.edits[2].replacement+=' Everyone benefits.';
 }
 return d;
}
await test('repair dossier locates P2 and cannot silently relabel its evidence',()=>{
 const d=brokenAudit('marker'),before=structuredClone(d),ctx=auditRepairContext(d,numberSentences(cases[3].essay));
 assert.deepEqual(d,before);assert.equal(ctx.sentences.length,1);
 const s=ctx.sentences[0];assert.equal(s.sentenceId,'S3');assert.equal(s.original,'For example local groups can organise free classes.');
 assert.deepEqual(s.punctuationCandidates[0].matchingEvidenceIndexes,[]);assert.equal(s.punctuationCandidates[0].id,'P2');
 assert(ctx.issues.some(x=>x.includes('punctuationChecks.P2')));
});
await test('adjacent-word insertion reconstructs text but still needs the complete punctuation marker',()=>{
 const d=sample(cases[3]);d.languageAudit.corrections[3].originalQuote='local groups';d.languageAudit.corrections[3].replacementQuote=', local groups';
 d.edits[2].replacement='For example , local groups can organise free classes.';
 const ss=numberSentences(cases[3].essay),ctx=auditRepairContext(d,ss);
 assert(ctx.issues.some(x=>x.includes('punctuationChecks.P2')));assert(!ctx.issues.some(x=>x.includes('EVERY change')));
 assert.deepEqual(ctx.sentences[0].punctuationCandidates[0].matchingEvidenceIndexes,[]);
 const description=reviewSchema(ss).properties.languageAudit.properties.punctuationChecks.properties.P2.description;
 assert.match(description,/For example/);assert.match(description,/S3/);
});
await test('overlap repair discards an unreliable reconstruction and identifies both original spans',()=>{
 const d=brokenAudit('overlap'),ctx=auditRepairContext(d,numberSentences(cases[3].essay));
 const s=ctx.sentences.find(s=>s.sentenceId==='S3');assert.deepEqual(s.overlaps,[[3,4]]);assert(s.conflicts.length);assert.equal(s.reconstructed,null);
 assert(ctx.issues.some(x=>x.startsWith('languageAudit.corrections[4].originalQuote')));
 assert(ctx.issues.some(x=>x.startsWith('edits[2].replacement')));
});
await test('unexplained change shows exact reconstructed and proposed sentences without accepting either',()=>{
 const d=sample(cases[3]);d.edits[2].replacement+=' Everyone benefits.';
 const s=auditRepairContext(d,numberSentences(cases[3].essay)).sentences[0];
 assert.equal(s.reconstructed,'For example, local groups can organise free classes.');
 assert.equal(s.proposedReplacements[0],s.reconstructed+' Everyone benefits.');
 assert(s.targets[0].unaccountedChanges.length);
 assert(s.targets[0].targetChanges.every(p=>s.original.includes(p.originalQuote)));
});
await test('conflicting original spans show exact target patches without accepting either',()=>{
 const d=brokenAudit('overlap'),ss=numberSentences(cases[3].essay),ctx=auditRepairContext(d,ss),s=ctx.sentences[0];
 assert.equal(s.reconstructed,null);assert.equal(s.targets[0].unaccountedChanges,null);
 assert(s.targets[0].targetChanges.length);
 assert(s.targets[0].targetChanges.every(p=>s.original.indexOf(p.originalQuote)>=0));
 assert(languageAuditIssues(d,ss).some(x=>x.includes('conflict')));
});
await test('review retry sees whole target delta and original offsets; unjustified additions still fail closed',async()=>{
 const bodies=[];globalThis.fetch=async(_,o)=>{
  bodies.push(JSON.parse(o.body));const d=bodies.length===1?sample(cases[3]):brokenAudit('overlap');
  if(bodies.length===1)delete d.languageAudit;return completion(d);
 };
 const r=await worker.fetch(req(cases[3]),env),d=await r.json();assert.equal(r.status,502);
 const retry=bodies[2].messages.find(m=>m.role==='user'&&JSON.parse(m.content).auditRepair);
 const dossier=JSON.parse(retry.content).auditRepair.sentences[0];
 assert(dossier.targets[0].targetChanges.length);assert.equal(dossier.targets[0].unaccountedChanges,null);
 assert(dossier.targets[0].targetChanges.every(p=>Number.isInteger(p.originalOffset)));
 assert(!d.nextDraft);assert(d.diagnostics.history.at(-1).checks.some(c=>c.rule==='UNEXPLAINED_CHANGE'));
});
for(const kind of ['marker','overlap']) await test('bounded ES review retry repairs '+kind+' using original sentence dossier',async()=>{
 const bodies=[],input={...cases[3],feedbackLanguage:'es'};
 globalThis.fetch=async(_,o)=>{bodies.push(JSON.parse(o.body));const d=bodies.length===2?brokenAudit(kind):sample(input);if(bodies.length===1)delete d.languageAudit;return completion(d);};
 const r=await worker.fetch(req(input),env),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert.equal(bodies.length,3);
 const repair=bodies[2].messages.filter(m=>m.role==='user').map(m=>JSON.parse(m.content)).find(m=>m.auditRepair)?.auditRepair;
 assert(repair);assert(repair.sentences.some(s=>s.sentenceId==='S3'));assert.match(repair.instruction,/Replace the old spans/);
 assert.deepEqual(d.languageAudit,sample(input).languageAudit);assert(d.nextDraft.includes('For example, local'));
 assert(!d.nextDraft.includes('Everyone benefits'));assert.equal(d.diagnostics.repairAttempts.review,1);
 assert.match(bodies[1].messages[0].content,/Build the evidence BEFORE/);
});
await test('reported two-review failure sequence still fails closed with precise final diagnostics',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;const d=calls===1?sample(cases[3]):brokenAudit(calls===2?'marker':'overlap');if(calls===1)delete d.languageAudit;return completion(d);};
 const r=await worker.fetch(req({...cases[3],feedbackLanguage:'es'}),env),d=await r.json();assert.equal(r.status,502);assert.equal(d.code,'ASSESSMENT_INCOMPLETE');assert(!d.nextDraft);assert.equal(calls,3);
 assert(d.diagnostics.history[1].checks.some(c=>c.field==='languageAudit.punctuationChecks.P2'));
 assert(d.diagnostics.history[2].checks.some(c=>c.field==='languageAudit.corrections[4].originalQuote'));
 assert(d.diagnostics.history[2].checks.some(c=>c.field==='edits[2].replacement'));
});
for(const i of [1,2]) await test('museum and correct energy survive review with no extra repair: '+cases[i].name,async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;const d=sample(cases[i]);if(calls===1)delete d.languageAudit;return completion(d);};
 const r=await worker.fetch(req(cases[i]),env),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert.equal(calls,2);
 if(i===2)assert.equal(d.nextDraft,cases[i].essay);
 else {assert(d.nextDraft.includes('and bought a ticket'));assert(d.nextDraft.includes('I read the exhibition guide last night.'));assert(d.nextDraft.includes('This morning I have had a coffee.'));}
});

await test('correct C1 language stays intact for a wrong history task without extra calls',async()=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/c1-environment-v562.json',import.meta.url),'utf8'));const input={...fixture,task:fixture.wrongTask};let calls=0;
 globalThis.fetch=async()=>{calls++;const d=sample(input);d.taskReview.verdict='not_answered';d.taskReview.checks[0].status='missing';d.taskReview.checks[0].evidenceIds=[];d.taskReview.checks[0].explanation='The energy paragraph does not address the historical task.';if(calls===1)delete d.languageAudit;return completion(d);};
 const r=await worker.fetch(req(input),env),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert.equal(calls,2);assert.equal(d.nextDraft,input.essay);assert.equal(d.taskReview.verdict,'not_answered');
});
await test('complete correct C1 essay answers its real task and retains all language',async()=>{
 const input=JSON.parse(await readFile(new URL('./fixtures/c1-environment-v562.json',import.meta.url),'utf8'));let calls=0;
 globalThis.fetch=async()=>{calls++;const d=sample(input);d.taskReview.verdict='answered';d.taskReview.checks[0].status='met';if(calls===1)delete d.languageAudit;return completion(d);};
 const r=await worker.fetch(req(input),env),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert.equal(calls,2);assert.equal(d.nextDraft,input.essay);assert.equal(d.taskReview.verdict,'answered');
});
globalThis.fetch=originalFetch;
console.log(`${checks} language-audit checks passed. All model replies and clock advances are synthetic, not live AI accuracy or speed evidence.`);
