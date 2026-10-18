import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker,{numberSentences,normaliseCoaching,taskAchievementVerdict,languageAuditIssues,evidenceChanges,combineEvidenceChanges,auditRepairContext} from '../apps/worker/src/worker.js';
const captured=JSON.parse(await readFile(new URL('./fixtures/v561-live-regressions.json',import.meta.url),'utf8'));
let checks=0;
async function test(name,run){await run();checks++;console.log('PASS',name);}
await test('captured B2 coverage remains answered despite optional evaluation depth',()=>{
 const c=captured['b2-library-es'],d=structuredClone(c.response),before=structuredClone(d),history=[];
 normaliseCoaching(d,numberSentences(c.request.essay),history);
 assert.equal(d.taskReview.verdict,'answered');assert.equal(history[0].from,'partly_answered');
 assert.deepEqual(d.taskReview.checks,before.taskReview.checks);assert.deepEqual(d.assessment,before.assessment);
 assert.deepEqual(d.edits,before.edits);assert.equal(d.nextDraft,before.nextDraft);
});
await test('captured off-topic C1 stays unanswered despite good organisation and language',()=>{
 const c=captured['c1-wrong-task-es'],d=structuredClone(c.response);normaliseCoaching(d,numberSentences(c.request.essay));
 assert.equal(d.taskReview.verdict,'not_answered');assert.equal(d.assessment.criteria.language.score,5);
});
await test('source evaluation and accuracy remain mandatory; style alone does not demote',()=>{
 const review={taskType:'source_essay',basis:'explicit',verdict:'answered',checks:['task_coverage','source_accuracy','evaluation','own_position'].map(requirement=>({requirement,status:'met'}))};
 review.checks.push({requirement:'organisation',status:'partial'});assert.equal(taskAchievementVerdict(review),'answered');
 for(const requirement of ['source_accuracy','evaluation','own_position']){
  const d=structuredClone(review);d.checks.find(c=>c.requirement===requirement).status='partial';assert.equal(taskAchievementVerdict(d),'partly_answered');
 }
 review.checks[0].status='missing';assert.equal(taskAchievementVerdict(review),'not_answered');
});
await test('missing, invalid or duplicate coverage is never inferred',()=>{
 for(const checks of [[],[{requirement:'task_coverage',status:'not_applicable'}],[{requirement:'task_coverage',status:'met'},{requirement:'task_coverage',status:'met'}]])
  assert.equal(taskAchievementVerdict({taskType:'other',basis:'explicit',verdict:'answered',checks}),null);
 assert.equal(taskAchievementVerdict({taskType:'other',basis:'missing',verdict:'not_assessable',checks:[{requirement:'task_coverage',status:'met'}]}),null);
 assert.equal(taskAchievementVerdict({taskType:'other',basis:'explicit',verdict:'answered',checks:[{requirement:'task_coverage',status:'partial'}]}),'partly_answered');
});
function audit(original,replacement,points,decision='correction'){
 return {edits:[{kind:'correction',sentenceId:'S1',replacement,reason:'Necessary corrections.'}],languageAudit:{checkedSentenceIds:['S1'],corrections:points.map(p=>({sentenceId:'S1',explanation:'Correct the identified original error.',...p})),punctuationChecks:{P1:{decision,explanation:'Check the marker in its original context.'}}}};
}
const original='Although, homeschooling has existed for over a century; what is more homeschooling existed before our current public education system.';
const replacement='Homeschooling has existed for over a century; what is more, homeschooling existed before our current public education system.';
const full={category:'grammar',originalQuote:original,replacementQuote:replacement};
const comma={category:'punctuation',originalQuote:'what is more homeschooling',replacementQuote:'what is more, homeschooling'};
await test('broad grammar evidence plus matching local punctuation reconstructs exactly once',()=>{
 const d=audit(original,replacement,[full,comma]),before=structuredClone(d);
 assert.deepEqual(languageAuditIssues(d,numberSentences(original)),[]);assert.deepEqual(d,before);
 assert.equal(auditRepairContext(d,numberSentences(original)),null);
});
await test('overlapping unchanged context supports independent nearby corrections',()=>{
 const text='It is an useful service; moreover it helps.';
 const d=audit(text,'It is a useful service; moreover, it helps.',[
  {category:'grammar',originalQuote:'an useful service; moreover',replacementQuote:'a useful service; moreover'},
  {category:'punctuation',originalQuote:'service; moreover it',replacementQuote:'service; moreover, it'}]);
 assert.deepEqual(languageAuditIssues(d,numberSentences(text)),[]);
});
await test('identical evidence is idempotent and does not insert a comma twice',()=>{
 const d=audit(original,replacement,[full,comma,comma]);assert.deepEqual(languageAuditIssues(d,numberSentences(original)),[]);
});
await test('conflicting actual edits cannot be hidden by a matching final draft',()=>{
 const d=audit(original,replacement,[full,comma,{...comma,replacementQuote:'what is more; homeschooling'}]);
 const issues=languageAuditIssues(d,numberSentences(original));assert(issues.some(s=>s.includes('conflict')));assert(issues.some(s=>s.includes('EVERY change')));
 const ctx=auditRepairContext(d,numberSentences(original));assert(ctx.sentences[0].conflicts.length);assert.equal(ctx.sentences[0].reconstructed,null);
});
await test('extra unexplained change is rejected even with compatible shared evidence',()=>{
 const d=audit(original,replacement+' This is always the best option.',[full,comma]);
 assert(languageAuditIssues(d,numberSentences(original)).some(s=>s.includes('EVERY change')));
});
await test('quoting a marker without changing it is not punctuation evidence',()=>{
 const text='Moreover it help students.';
 const d=audit(text,'Moreover it helps students.',[{category:'punctuation',originalQuote:text,replacementQuote:'Moreover it helps students.'}]);
 assert(languageAuditIssues(d,numberSentences(text)).some(s=>s.includes('matching punctuation evidence')));
});
await test('insertions inside deleted regions and incompatible insertions fail closed',()=>{
 for(const spans of [
  [{index:0,changes:[{start:1,end:4,replacementQuote:''}]},{index:1,changes:[{start:2,end:2,replacementQuote:','}]}],
  [{index:0,changes:[{start:2,end:2,replacementQuote:','}]},{index:1,changes:[{start:2,end:2,replacementQuote:';'}]}]
 ]){const p=combineEvidenceChanges('abcde',spans);assert(p.conflicts.length);assert.equal(p.reconstructed,null);}
});
await test('boundary insertions, repeated words, Unicode and deletions reproduce exact text',()=>{
 for(const [a,b] of [['abc','XAbc'],['one one one','one two one'],['café 😀 is nice','café 😀 was nice'],['abc',''],['','abc'],['a\r\nb','a\nb'],[original,replacement]]){
  const plan=combineEvidenceChanges(a,[{index:0,changes:evidenceChanges(a,b)}]);assert.equal(plan.reconstructed,b);assert.deepEqual(plan.conflicts,[]);
 }
});
await test('bounded large-input fallback preserves exact replacement',()=>{
 const a='a '+('same '.repeat(400))+'b',b='x '+('same '.repeat(400))+'y';
 const patches=evidenceChanges(a,b);assert.equal(patches.length,1);
 assert.equal(combineEvidenceChanges(a,[{index:0,changes:patches}]).reconstructed,b);
});
await test('deterministic varied strings reconstruct without changing original coordinates',()=>{
 let seed=17;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed;};
 const alphabet=['a','b',' ',';',',','\n','é','😀'];
 for(let i=0;i<400;i++){
  const make=()=>Array.from({length:rnd()%30},()=>alphabet[rnd()%alphabet.length]).join('');
  const a=make(),b=make(),p=combineEvidenceChanges(a,[{index:0,changes:evidenceChanges(a,b)}]);assert.equal(p.reconstructed,b);
 }
});
function response(){
 const d=audit(original,replacement,[full,comma]);
 return {...d,sampleSuitable:true,feedback:'Correct the connector and its punctuation.',
  assessment:{taskSufficient:true,criteria:Object.fromEntries(['content','communicative','organisation','language'].map(k=>[k,{score:3,reason:'The paragraph communicates its main point.',evidenceIds:['S1']}]))},
  keyFocus:{action:'Check the logical connector.',evidenceId:'S1',explanation:'The two ideas reinforce each other.'},
  taskReview:{taskType:'other',basis:'explicit',verdict:'answered',expectedResponse:'Explain the history of homeschooling.',explanation:'The paragraph addresses the topic.',checks:[{requirement:'task_coverage',status:'met',explanation:'The history is discussed.',evidenceIds:['S1']},{requirement:'evaluation',status:'partial',explanation:'Further development is optional here.',evidenceIds:['S1']}]},
  sourceReview:[],learningPoints:[{category:'language',kind:'correction',evidenceId:'S1',sourceQuote:'',issue:'Use an additive relation.',explanation:'The two historical facts reinforce each other.',improvedExample:replacement,practiceInstruction:'Explain whether the ideas contrast or reinforce each other.',checkQuestion:'Is there a real contrast?'}],sentenceInsights:[],vocabularySuggestions:[]};
}
await test('complete Worker accepts compatible context without retries and preserves task achievement',async()=>{
 const saved=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async()=>{calls++;const d=response();if(calls===1)delete d.languageAudit;return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(d)}}]}));};
  const r=await worker.fetch(new Request('https://test/api/correct',{method:'POST',body:JSON.stringify({level:'B2',task:'Explain the history of homeschooling.',essay:original,feedbackLanguage:'en'})}),{OPENAI_API_KEY:'mock'});
  const d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert.equal(calls,2);assert.equal(d.nextDraft,replacement);assert.equal(d.taskReview.verdict,'answered');
 }finally{globalThis.fetch=saved;}
});
await test('complete Worker still rejects persistent conflicting evidence',async()=>{
 const saved=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async()=>{calls++;const d=response();if(calls===1)delete d.languageAudit;else d.languageAudit.corrections.push({...d.languageAudit.corrections[1],replacementQuote:'what is more; homeschooling'});return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(d)}}]}));};
  const r=await worker.fetch(new Request('https://test/api/correct',{method:'POST',body:JSON.stringify({level:'B2',task:'Explain the history of homeschooling.',essay:original})}),{OPENAI_API_KEY:'mock'});
  const d=await r.json();assert.equal(r.status,502);assert.equal(calls,3);assert.equal(d.nextDraft,undefined);assert(d.diagnostics.issues.some(s=>s.includes('conflict')));
 }finally{globalThis.fetch=saved;}
});
console.log(`${checks} v5.6.1 regression checks passed; model replies are mocked. The captured failures came from the previous live version.`);
