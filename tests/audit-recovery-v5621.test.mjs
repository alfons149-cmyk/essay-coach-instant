import assert from 'node:assert/strict';
import worker,{numberSentences,constructAuditedEdits,languageAuditIssues,correctedSentenceIssues,surfaceCandidates,sourceOrderIssues,auditRepairContext,sentenceRepairCandidates,resolveSentenceRepairs,reviewSchema,validate} from '../apps/worker/src/worker.js';
let checks=0;const saved=globalThis.fetch;
async function test(name,fn){try{await fn();checks++;console.log('PASS',name);}finally{globalThis.fetch=saved;}}
const original='A worker need support and a student need advice and a teacher need help.';
const corrected='A worker needs support and a student needs advice and a teacher needs help.';
const input={essay:original,task:'Explain why people need support.',level:'B2',feedbackLanguage:'en'};
const explanation='A singular subject takes needs.';
function reply(review,local=false){
 const d={sampleSuitable:true,feedback:'The paragraph identifies people who need support.',assessment:{taskSufficient:true,criteria:Object.fromEntries(['content','communicative','organisation','language'].map(k=>[k,{score:3,reason:'The paragraph communicates its main point.',evidenceIds:['S1']}]))},keyFocus:{action:'Check singular subjects.',evidenceId:'S1',explanation},taskReview:{taskType:'other',basis:'explicit',verdict:'answered',expectedResponse:input.task,explanation:'The paragraph addresses support.',checks:[{requirement:'task_coverage',status:'met',explanation:'The topic is addressed.',evidenceIds:['S1']}]},sourceReview:[],learningPoints:[{category:'language',kind:'correction',evidenceId:'S1',sourceQuote:'',issue:'Check agreement.',explanation,improvedExample:corrected,practiceInstruction:'Check each subject and verb.',checkQuestion:'Are the subjects singular?'}],sentenceInsights:[],vocabularySuggestions:[]};
 if(!review)d.edits=[{kind:'correction',sentenceId:'S1',replacement:corrected,reason:explanation}];
 else d.languageAudit={checkedSentenceIds:['S1'],punctuationChecks:{},corrections:(local?['A worker need','a student need','a teacher need'].map(q=>({originalQuote:q,replacementQuote:q+'s'})):[{originalQuote:original,replacementQuote:corrected}]).map(p=>({sentenceId:'S1',category:'grammar',explanation,...p}))};
 return d;
}
const request=()=>new Request('https://test/api/correct',{method:'POST',body:JSON.stringify(input)});
const completion=d=>new Response(JSON.stringify({usage:{prompt_tokens:200,completion_tokens:100},choices:[{finish_reason:'stop',message:{content:JSON.stringify(d)}}]}));

const extra=['A pilot need rest.','A nurse need sleep.','A driver need advice.','A baker need help.','A farmer need support.','A doctor need time.'];
const essay=[original,...extra].join(' '),ss=numberSentences(essay);
function broadSeven(){const d=reply(true);d.languageAudit.checkedSentenceIds=ss.map(s=>s.id);extra.forEach((s,i)=>d.languageAudit.corrections.push({sentenceId:'S'+(i+2),category:'grammar',originalQuote:s,replacementQuote:s.replace(' need ',' needs '),explanation}));return d;}
function repairPlan(d){const errors=constructAuditedEdits(d,ss);return {errors,repair:auditRepairContext(d,ss,errors)};}
function selected(repair,count=6){return repair.recoveryCandidates.slice(0,count).map(c=>({sentenceId:c.sentenceId,explanations:Object.fromEntries(c.fragments.map(f=>[f.id,'The singular subject requires needs instead of need.']))}));}
await test('broad plus seven sentences repair through constrained independent review',async()=>{
 const bodies=[];globalThis.fetch=async(_,o)=>{
  const b=JSON.parse(o.body);bodies.push(b);
  if(bodies.length===1)return completion(reply(false));
  if(bodies.length===2)return completion(broadSeven());
  const repair=JSON.parse(b.messages.find(m=>m.role==='user'&&m.content.includes('"auditRepair"')).content).auditRepair;
  assert.equal(repair.recoveryCandidates.length,7);assert.equal(repair.recoveryCandidates[0].fragments.length,3);
  assert.equal(repair.limits.sentences,6);assert.equal(repair.limits.fragments,18);
  assert(b.messages.some(m=>m.content.includes('omit the WHOLE sentence')));
  const audit=b.response_format.json_schema.schema.properties.languageAudit;
  assert.equal(audit.properties.corrections,undefined);assert.equal(audit.properties.sentenceRepairs.maxItems,6);
  const d=reply(true);d.languageAudit={checkedSentenceIds:ss.map(s=>s.id),punctuationChecks:{},sentenceRepairs:selected(repair)};return completion(d);
 };
 const r=await worker.fetch(new Request('https://test/api/correct',{method:'POST',body:JSON.stringify({...input,essay})}),{OPENAI_API_KEY:'mock'}),d=await r.json();
 assert.equal(r.status,200,JSON.stringify(d));assert.equal(bodies.length,3);assert.equal(d.edits.length,6);
 assert.equal(d.nextDraft,[corrected,...extra.map((s,i)=>i<5?s.replace(' need ',' needs '):s)].join(' '));
 assert.equal(d.learningPoints[0].improvedExample,corrected);assert.equal(d.diagnostics.reviewCompleted,true);
 const checks=d.diagnostics.history.find(h=>h.phase==='review').checks;
 assert(checks.some(c=>c.rule==='EVIDENCE_GRANULARITY'));assert(checks.some(c=>c.rule==='RESPONSE_CONSISTENCY'));
});
await test('persistent broad evidence fails closed after the same review budget',async()=>{
 let calls=0;globalThis.fetch=async()=>completion(++calls===1?reply(false):broadSeven());
 const r=await worker.fetch(new Request('https://test/api/correct',{method:'POST',body:JSON.stringify({...input,essay})}),{OPENAI_API_KEY:'mock'}),d=await r.json();
 assert.equal(r.status,502);assert.equal(calls,3);assert.equal(d.nextDraft,undefined);assert.equal(d.diagnostics.reviewCompleted,false);
});
await test('recovery changes round-trip original offsets and every complete sentence',()=>{
 const {repair}=repairPlan(broadSeven());
 for(const c of repair.recoveryCandidates)for(const f of c.fragments)assert.equal(c.original.slice(f.quoteOffset,f.quoteEnd),f.originalQuote);
 const d={languageAudit:{checkedSentenceIds:ss.map(s=>s.id),punctuationChecks:{},sentenceRepairs:selected(repair)}};
 assert.deepEqual(resolveSentenceRepairs(d,repair),[]);assert.deepEqual(constructAuditedEdits(d,ss),[]);assert.deepEqual(languageAuditIssues(d,ss),[]);
 assert.equal(d.edits[0].replacement,corrected);assert.equal(d.languageAudit.corrections.length,8);
});
await test('partial sentences duplicate IDs unknown IDs and seven choices are rejected',()=>{
 const {repair}=repairPlan(broadSeven());
 for(const mutate of [a=>delete a[0].explanations.F1,a=>a.push(a[0]),a=>a[0].sentenceId='S999',a=>a[0].explanations.SECRET='invented',a=>a.push(selected(repair,7)[6])]){
  const a=selected(repair);mutate(a);const d={languageAudit:{sentenceRepairs:a}};assert(resolveSentenceRepairs(d,repair).length);assert.equal(d.languageAudit.corrections,undefined);
 }
});
await test('conflicting original positions and fabricated quotes cannot become recovery candidates',()=>{
 for(const p of [{originalQuote:'A worker need',replacementQuote:'A worker needed'},{originalQuote:'A worker wanted',replacementQuote:'A worker needs'}]){
  const d=broadSeven();d.languageAudit.corrections.push({sentenceId:'S1',category:'grammar',explanation,...p});
  const {errors,repair}=repairPlan(d);assert(errors.length);assert.equal(repair.recoveryCandidates.length,0);
  assert.equal(sentenceRepairCandidates(d,ss,['split broad evidence']).length,0);
 }
});
await test('valid local evidence remains valid without entering constrained recovery',()=>{
 const d=reply(true,true),sentences=numberSentences(original);assert.deepEqual(constructAuditedEdits(d,sentences),[]);
 assert.equal(auditRepairContext(d,sentences),null);assert.deepEqual(languageAuditIssues(d,sentences),[]);
 assert(reviewSchema(sentences).properties.languageAudit.properties.corrections);
});
await test('fragment budget rejects a selection of otherwise complete sentences',()=>{
 const {repair}=repairPlan(broadSeven());
 const many={recoveryCandidates:repair.recoveryCandidates.slice(0,6).map(c=>({...c,fragments:Array.from({length:4},(_,i)=>({...c.fragments[0],id:'F'+i}))}))};
 const d={languageAudit:{sentenceRepairs:selected(many)}};
 assert(resolveSentenceRepairs(d,many).some(e=>e.includes('eighteen-fragment')));assert.equal(d.languageAudit.corrections,undefined);
});
await test('a repeated quote gets unique original context without changing its target',()=>{
 const source='A child need help and a child need help and a child need rest.';
 const sentences=numberSentences(source),d=reply(true);d.languageAudit.corrections=[{sentenceId:'S1',category:'grammar',explanation,originalQuote:source,replacementQuote:source.replaceAll(' need ',' needs ')}];
 const errors=constructAuditedEdits(d,sentences),repair=auditRepairContext(d,sentences,errors);
 assert.equal(repair.recoveryCandidates.length,1);
 for(const f of repair.recoveryCandidates[0].fragments){assert.equal(source.indexOf(f.originalQuote),f.quoteOffset);assert.equal(source.indexOf(f.originalQuote,f.quoteOffset+1),-1);}
 const rebuilt={languageAudit:{checkedSentenceIds:['S1'],punctuationChecks:{},sentenceRepairs:selected(repair)}};
 assert.deepEqual(resolveSentenceRepairs(rebuilt,repair),[]);assert.deepEqual(constructAuditedEdits(rebuilt,sentences),[]);assert.deepEqual(languageAuditIssues(rebuilt,sentences),[]);assert.equal(rebuilt.edits[0].replacement,source.replaceAll(' need ',' needs '));
});
await test('constrained reconstruction cannot bypass the causal-for final protection',()=>{
 const source='A worker need support and a student need advice, for they need help.';
 const sentences=numberSentences(source),d=reply(true);d.languageAudit.corrections=[{sentenceId:'S1',category:'grammar',explanation,originalQuote:source,replacementQuote:source.replace('worker need','worker needs').replace('student need','student needs').replace('for they','because they')}];
 const errors=constructAuditedEdits(d,sentences),repair=auditRepairContext(d,sentences,errors);assert.equal(repair.recoveryCandidates.length,1);
 const result=reply(true);result.languageAudit={checkedSentenceIds:['S1'],punctuationChecks:{},sentenceRepairs:selected(repair)};
 assert.deepEqual(resolveSentenceRepairs(result,repair),[]);assert.deepEqual(constructAuditedEdits(result,sentences),[]);
 assert(validate(result,{...input,essay:source},sentences).some(e=>/causal for/.test(e)));
});
console.log(`${checks} v5.6.21 audit recovery checks passed; mocked provider only.`);
