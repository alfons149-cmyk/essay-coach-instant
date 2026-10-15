import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker,{numberSentences,taskReadingSchema,validateTaskReading,validate,toClient,teachingSignals,buildSignalHints} from '../apps/worker/src/worker.js';
const input=JSON.parse(await readFile(new URL('./fixtures/homeschooling-c2.json',import.meta.url),'utf8'));
const {sourceBodies,...payload}=input,ss=numberSentences(payload.essay);
const id=part=>ss.find(s=>s.text.includes(part)).id;
const mistaken=id('not widely recognized'),closing=id('both advantages'),punctuation=id('however effective'),although=id('Although,');
const plan={taskType:'source_essay',instructionStatus:'assumed',summary:'Assume a C2 essay summarising and evaluating the two sources, with a supported personal position.',sources:[
 {label:'Text 1',sourceQuote:sourceBodies[0],position:'Homeschooling adds teaching duties and can reduce family income.',keyPoints:[{quote:'your family may suffer a loss in income',meaning:'Parents may face a financial cost.'}]},
 {label:'Text 2',sourceQuote:sourceBodies[1],position:'The body refutes the negative heading: homeschooling is established and supported.',keyPoints:[{quote:'homeschooling is well-established, with curriculum options and support groups',meaning:'Homeschooling has an established infrastructure.'}]}
]};
function assessment(){return {
 sampleSuitable:true,feedback:'You identify practical pressures, but reverse the second author’s position. Explain that the author defends homeschooling as established, then weigh that support against the financial cost. Your conclusion states a view but needs supporting reasoning.',
 assessment:{taskSufficient:true,criteria:{
  content:{score:2,reason:'The second source is misinterpreted and its available support is not represented accurately.',evidenceIds:[mistaken]},
  communicative:{score:2,reason:'The text mainly summarises; the closing opinion is not developed through evaluation.',evidenceIds:[closing]},
  organisation:{score:3,reason:'Clear paragraphs, but although does not express a clear concession here.',evidenceIds:[although]},
  language:{score:3,reason:'Repair the clause construction and however punctuation.',evidenceIds:[punctuation,although]}}},
 keyFocus:{action:'Correct your interpretation of the second source.',evidenceId:mistaken,explanation:'The body challenges the heading; it does not endorse it.'},
 sourceReview:[{sourceQuote:plan.sources[0].keyPoints[0].quote,point:'Financial cost',coverage:'covered',essayEvidenceIds:[id('reduction in your')],explanation:'The essay mentions possible reduced income.'},
  {sourceQuote:plan.sources[1].keyPoints[0].quote,point:'An established alternative',coverage:'distorted',essayEvidenceIds:[mistaken],explanation:'The essay attributes the rejected view to the author.'}],
 taskReview:{taskType:'source_essay',basis:'assumed',verdict:'partly_answered',expectedResponse:plan.summary,explanation:'The instructions are absent, so this is a provisional C2 source-essay review.',checks:[
  {requirement:'task_coverage',status:'partial',explanation:'The practical costs are included; available support needs attention.',evidenceIds:[id('reduction in your')]},
  {requirement:'source_accuracy',status:'partial',explanation:'The second author’s position is reversed.',evidenceIds:[mistaken]},
  {requirement:'evaluation',status:'missing',explanation:'A generic closing opinion does not weigh the source arguments.',evidenceIds:[closing]},
  {requirement:'own_position',status:'partial',explanation:'A view is expressed but its reasoning needs development.',evidenceIds:[closing]}]},
 learningPoints:[{category:'source_interpretation',kind:'correction',evidenceId:mistaken,sourceQuote:plan.sources[1].keyPoints[0].quote,issue:'A heading is mistaken for the author’s position.',explanation:'Read the body: it provides evidence against the heading’s claim.',improvedExample:'The second text challenges the idea that homeschooling is not an established form of education.',practiceInstruction:'Rewrite your summary of the second author’s position using evidence from the body.',checkQuestion:'Does the body support or refute the heading?'},
  {category:'task_response',kind:'development',evidenceId:closing,sourceQuote:plan.sources[0].keyPoints[0].quote,issue:'Your judgement needs a reason.',explanation:'Connect the available support with the costs parents may face.',improvedExample:'Support groups may reduce the organisational burden, but they do not necessarily replace lost income.',practiceInstruction:'Write two sentences weighing one benefit against one limitation.',checkQuestion:'Have you explained why one consideration matters rather than merely listing both?'}],
 edits:[{kind:'correction',sentenceId:punctuation,replacement:ss.find(s=>s.id===punctuation).text.replace('however effective','however, effective'),reason:'Add the comma after the linking adverb however.'},
  {kind:'correction',sentenceId:although,replacement:'Homeschooling has existed for over a century and predates our current public education system.',reason:'These facts reinforce the same point; no concession is expressed.'}],sentenceInsights:[],vocabularySuggestions:[]
};}
let checks=0;
async function test(name,fn){await fn();checks++;console.log('PASS',name);}
await test('source-only schema is strict and verifies literal non-overlapping source bodies',()=>{
 assert.equal(taskReadingSchema().additionalProperties,false);assert.deepEqual(validateTaskReading(plan,payload.task),[]);
 const bad=structuredClone(plan);bad.sources[1].sourceQuote=bad.sources[0].sourceQuote;
 assert(validateTaskReading(bad,payload.task).some(x=>x.includes('non-overlapping')));
 bad.sources[1].sourceQuote='Invented source quotation that is not present in the original writing task.';
 assert(validateTaskReading(bad,payload.task).length);
});
await test('homeschooling example separates source distortion and weak evaluation from grammar edits',()=>{
 const d=assessment(),p={...payload,sourceReading:plan};assert.deepEqual(validate(d,p,ss),[]);
 const result=toClient(d,p,ss,3);
 assert.equal(result.taskReview.verdict,'partly_answered');assert.equal(result.taskReview.basis,'assumed');
 assert.equal(result.learningPoints[0].example,ss.find(s=>s.id===mistaken).text);
 assert.equal(result.sourceReview[1].essayEvidence[0],result.learningPoints[0].example);
 assert(result.nextDraft.includes('not widely recognized')); // Learner must rewrite the interpretation.
 assert(!result.nextDraft.includes('Support groups may'));assert.equal(result.edits.length,2);
});
await test('contradictory task success, full source accuracy and Content 5 are rejected',()=>{
 const d=assessment();d.taskReview.verdict='answered';d.taskReview.checks[1].status='met';d.assessment.criteria.content.score=5;
 const issues=validate(d,{...payload,sourceReading:plan},ss);
 assert(issues.some(s=>s.includes('partly met')));assert(issues.some(s=>s.includes('Source distortion')));assert(issues.some(s=>s.includes('Content 5')));
});
await test('source distortion cannot be hidden behind punctuation priority or absent learning evidence',()=>{
 const d=assessment();d.keyFocus.evidenceId=punctuation;d.learningPoints.shift();
 const issues=validate(d,{...payload,sourceReading:plan},ss);
 assert(issues.some(s=>s.includes('source_interpretation')));assert(issues.some(s=>s.includes('Prioritise')));
});
await test('missing source key points and invented learning quotes are rejected',()=>{
 const d=assessment();d.sourceReview.pop();d.learningPoints[0].sourceQuote='A fabricated source statement.';
 const issues=validate(d,{...payload,sourceReading:plan},ss);
 assert(issues.some(s=>s.includes('each source-only key point')));assert(issues.some(s=>s.includes('exact source/essay evidence')));
});
await test('language teaching correction must match a real applied edit',()=>{
 const d=assessment();d.learningPoints.push({...d.learningPoints[1],category:'language',kind:'correction',evidenceId:punctuation,improvedExample:'Invented replacement.'});
 assert(validate(d,{...payload,sourceReading:plan},ss).some(s=>s.includes('match an actual edit')));
});
await test('missing instructions cannot be represented as an explicit or fully assessed task',()=>{
 const d=assessment();d.taskReview.basis='explicit';assert(validate(d,{...payload,sourceReading:plan},ss).some(s=>s.includes('explicit/assumed/missing')));
 assert(validate(d,{...payload,task:''},ss).some(s=>s.includes('Missing task')));
});
await test('for beneficiary/conjunction and causal since get no duration reminder',()=>{
 for(const sentence of ['The challenge is greater for single parents.','Parents choose homeschooling, for parents observe bullying.','I bought a book for a friend.','Since parents are concerned, they seek alternatives.']) {
  assert.deepEqual(teachingSignals(sentence),[],sentence);
  assert.deepEqual(buildSignalHints({essay:sentence},numberSentences(sentence)),[],sentence);
 }
 for(const signal of ['for over a century','for two weeks','for years','since 2010']) assert(teachingSignals('Homeschooling has existed '+signal+'.').includes(signal),signal);
});
const request=()=>new Request('https://worker.test/api/correct',{method:'POST',body:JSON.stringify(payload)});
const completion=d=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(d)}}]}));
const env={OPENAI_API_KEY:'mock-not-a-key'};
await test('C2 source reading precedes essay assessment and never sees the learner interpretation',async()=>{
 const bodies=[];globalThis.fetch=async(_,o)=>{bodies.push(JSON.parse(o.body));return completion(bodies.length===1?plan:assessment());};
 const response=await worker.fetch(request(),env),result=await response.json();assert.equal(response.status,200,JSON.stringify(result));
 assert.equal(bodies.length,3);assert.deepEqual(result.diagnostics.phaseAttempts,{task:1,assessment:1,review:1});
 assert(!JSON.stringify(bodies[0]).includes('not widely recognized'));assert(!JSON.stringify(bodies[0]).includes('Over these past few years'));
 const assessmentInput=JSON.parse(bodies[1].messages.find(m=>m.role==='user').content);
 assert.equal(assessmentInput.essay,payload.essay);assert.deepEqual(assessmentInput.sourceReading,plan);
 assert.equal(result.diagnostics.reviewCompleted,true);
});
await test('failed literal source evidence is repaired before any essay assessment',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;const bad=structuredClone(plan);bad.sources[1].keyPoints[0].quote='not in the source';return completion(calls===1?bad:calls===2?plan:assessment());};
 const response=await worker.fetch(request(),env),result=await response.json();assert.equal(response.status,200);assert.equal(calls,4);
 assert.deepEqual(result.diagnostics.phaseAttempts,{task:2,assessment:1,review:1});
});
await test('persistent source-reading failure returns no assessment or corrected draft',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return completion({...plan,sources:[]});};
 const response=await worker.fetch(request(),env),result=await response.json();assert.equal(response.status,502);assert.equal(calls,2);
 assert.equal(result.diagnostics.phase,'task');assert(!result.nextDraft);assert(!result.assessment);
});
await test('review cannot conceal source distortion by changing only the overall verdict',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;const d=assessment();if(calls===3)d.taskReview.verdict='answered';return completion(calls===1?plan:d);};
 const response=await worker.fetch(request(),env),result=await response.json();assert.equal(response.status,200);assert.equal(calls,4);
 assert.equal(result.taskReview.verdict,'partly_answered');assert.equal(result.diagnostics.phaseAttempts.review,2);
});
console.log(`${checks} coaching checks passed. Model interpretation is mocked; live quality requires deployment testing.`);

await test('C2 ordinary email task is not forced into source synthesis',async()=>{
 const p={level:'C2',feedbackLanguage:'en',task:'Write an informal email to a friend about your weekend.',essay:'I visited my sister last weekend.'};
 const ordinaryPlan={taskType:'other',instructionStatus:'explicit',summary:'An informal email about the weekend.',sources:[]};
 const d=assessment();d.sourceReview=[];d.sentenceInsights=[];d.edits=[];
 for(const c of Object.values(d.assessment.criteria)) {c.evidenceIds=['S1'];c.score=3;c.reason='Assess this short sample cautiously.';}
 d.keyFocus={action:'Develop the account of your visit.',evidenceId:'S1',explanation:'Add one relevant detail for your friend.'};
 d.learningPoints=[{...d.learningPoints[1],sourceQuote:'',evidenceId:'S1',improvedExample:'I visited my sister last weekend.'}];
 d.taskReview={taskType:'other',basis:'explicit',verdict:'partly_answered',expectedResponse:ordinaryPlan.summary,explanation:'The event is mentioned but needs development.',checks:[{requirement:'task_coverage',status:'partial',explanation:'The weekend visit is briefly mentioned.',evidenceIds:['S1']}]};
 let calls=0;globalThis.fetch=async()=>completion(++calls===1?ordinaryPlan:d);
 const response=await worker.fetch(new Request('https://worker.test/api/correct',{method:'POST',body:JSON.stringify(p)}),env),result=await response.json();
 assert.equal(response.status,200,JSON.stringify(result));assert.equal(calls,3);assert.equal(result.taskReview.taskType,'other');assert.deepEqual(result.sourceReview,[]);
 assert(!result.taskReview.checks.some(c=>c.requirement==='evaluation'));
});
await test('source-only phase shares the overall deadline rather than extending it',async()=>{
 const oldNow=Date.now;let elapsed=0,calls=0;Date.now=()=>elapsed;
 try {
  globalThis.fetch=async()=>{calls++;elapsed+=100000;return completion(calls===1?plan:assessment());};
  const response=await worker.fetch(request(),env),result=await response.json();assert.equal(response.status,504);assert.equal(calls,2);assert.equal(result.diagnostics.phase,'review');
 } finally {Date.now=oldNow;}
});
console.log(`${checks} final coaching checks passed; model calls mocked.`);
