import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import workerImpl,{numberSentences,taskReadingSchema,validateTaskReading,validate,toClient,teachingSignals,buildSignalHints,sourceCatalog,responseSchema,resolveSourceReferences,normaliseCoaching,writingMetrics,punctuationCandidates,languageAuditIssues,sourceInput} from '../apps/worker/src/worker.js';
import {withReviewContract} from './helpers/review-contract.mjs';
const worker=withReviewContract(workerImpl);
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
 sourceReview:[{sourceQuote:plan.sources[0].keyPoints[0].quote,point:'Financial cost',coverage:'covered',evidenceRelation:'agrees',essayEvidenceIds:[id('reduction in your')],explanation:'The essay mentions possible reduced income.'},
  {sourceQuote:plan.sources[1].keyPoints[0].quote,point:'An established alternative',coverage:'distorted',evidenceRelation:'contradicts',essayEvidenceIds:[mistaken],explanation:'The essay attributes the rejected view to the author.'}],
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
 assert(issues.some(s=>s.includes('Task verdict must match')));assert(issues.some(s=>s.includes('Source distortion')));assert(issues.some(s=>s.includes('Content 5')));
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
function wire(d) {
 const copy=structuredClone(d);
 if(copy.taskReview?.taskType!=='source_essay') return copy;
 const catalog=sourceCatalog(plan);
 copy.sourceReviewById=Object.fromEntries(catalog.map(p=>{
  const review=copy.sourceReview.find(s=>s.sourceQuote===p.quote);
  const {sourceQuote,...entry}=review;return [p.id,entry];
 }));
 delete copy.sourceReview;
 for(const point of copy.learningPoints) {
  point.sourcePointId=catalog.find(p=>p.quote===point.sourceQuote)?.id||'';delete point.sourceQuote;
 }
 return copy;
}
const completion=d=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(wire(d))}}]}));
const env={OPENAI_API_KEY:'mock-not-a-key'};
await test('two substantial source passages constrain classification without topic rules',()=>{
 const contract=sourceInput(payload.task);
 assert.deepEqual(contract,{bodies:sourceBodies,explicit:false});
 assert.deepEqual(taskReadingSchema(contract).properties.taskType.enum,['source_essay']);
 assert.deepEqual(taskReadingSchema(contract).properties.instructionStatus.enum,['assumed']);
 assert.deepEqual(validateTaskReading(plan,payload.task,contract),[]);
 assert(validateTaskReading({taskType:'other',instructionStatus:'missing',summary:'Other.',sources:[]},payload.task,contract).length);
 assert.deepEqual(sourceInput('Write about renewable energy.\n\nCompare the claims of two speakers.'),null);
 assert.deepEqual(sourceInput('Write an informal email to a friend.\nDiscuss your weekend.'),null);
});
await test('separate C2 source fields bind verbatim text and distinguish absent instructions',async()=>{
 const contract=sourceInput('',sourceBodies);
 assert.deepEqual(contract,{bodies:sourceBodies,explicit:false});
 assert.equal(sourceInput('Write an essay.',sourceBodies).explicit,true);
 let calls=0;globalThis.fetch=async(_,o)=>{
  calls++;const sent=JSON.parse(o.body);
  if(calls===1){assert.deepEqual(sent.response_format.json_schema.schema.properties.taskType.enum,['source_essay']);
   assert.deepEqual(sent.response_format.json_schema.schema.properties.instructionStatus.enum,['assumed']);return completion(plan);}
  return completion(assessment());
 };
 const r=await worker.fetch(new Request('https://worker.test/api/correct',{method:'POST',body:JSON.stringify({...payload,task:'',sourceBodies})}),{OPENAI_API_KEY:'mock'});
 const result=await r.json();assert.equal(r.status,200,JSON.stringify(result));assert.equal(calls,3);assert.equal(result.diagnostics.taskRechecks,0);
});
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
 assert.equal(result.diagnostics.history.at(-1).checks[0].field,'sourceReading.sources');
});
await test('review cannot conceal source distortion by changing only the overall verdict',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;const d=assessment();if(calls===3)d.taskReview.verdict='answered';return completion(calls===1?plan:d);};
 const response=await worker.fetch(request(),env),result=await response.json();assert.equal(response.status,200);assert.equal(calls,3);
 assert.equal(result.taskReview.verdict,'partly_answered');assert.equal(result.diagnostics.phaseAttempts.review,1);
 assert.equal(result.diagnostics.history[2].normalisations[0].field,'taskReview.verdict');
 assert(result.sourceReview.some(r=>r.coverage==='distorted')); // Source findings remain explicit.
});
await test('an explicitly opposite source stance cannot be downgraded to partial coverage',async()=>{
 const d=assessment(),source=d.sourceReview[1];source.coverage='partial';
 source.explanation='The essay omits the supporting details, but its cited sentence states the opposite position.';
 const errors=validate(d,{...payload,sourceReading:plan},ss);
 assert(errors.some(e=>e.includes('sourceReview.evidenceRelation')));
 assert.equal(source.evidenceRelation,'contradicts');
});
await test('compatible but incomplete and absent source points remain valid alternatives',()=>{
 const compatible=assessment();compatible.sourceReview[0].coverage='partial';
 assert.deepEqual(validate(compatible,{...payload,sourceReading:plan},ss),[]);
 const absent=assessment();absent.sourceReview[0].coverage='missing';
 absent.sourceReview[0].evidenceRelation='absent';absent.sourceReview[0].essayEvidenceIds=[];
 assert.deepEqual(validate(absent,{...payload,sourceReading:plan},ss),[]);
});
await test('review repairs a partial-versus-contradictory source finding before release',async()=>{
 const bodies=[];globalThis.fetch=async(_,o)=>{
  bodies.push(JSON.parse(o.body));if(bodies.length===1)return completion(plan);
  const d=assessment();if(bodies.length===3){d.sourceReview[1].coverage='partial';
   d.sourceReview[1].explanation='Missing support, despite the opposite author claim.';}
  return completion(d);
 };
 const response=await worker.fetch(request(),env),result=await response.json();
 assert.equal(response.status,200,JSON.stringify(result));assert.equal(bodies.length,4);
 assert(result.diagnostics.history[2].checks.some(c=>c.field==='sourceReview.evidenceRelation'));
 assert.equal(result.sourceReview[1].coverage,'distorted');
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

await test('source IDs are required by the schema, and exact quotations are attached only by the server',()=>{
 const catalog=sourceCatalog(plan),schema=responseSchema(ss,plan,'nl'),d=wire(assessment());
 assert(!('sourceReview' in schema.properties));
 assert.deepEqual(schema.properties.sourceReviewById.required,catalog.map(p=>p.id));
 assert(!('sourceQuote' in schema.properties.learningPoints.items.anyOf[0].properties));
 assert(schema.properties.learningPoints.items.anyOf[0].properties.sourcePointId.enum.includes(catalog[1].id));
 assert.deepEqual(resolveSourceReferences(d,plan),[]);
 assert.deepEqual(d.sourceReview.map(s=>s.sourceQuote),catalog.map(p=>p.quote));
 assert.equal(d.learningPoints[0].sourceQuote,plan.sources[1].keyPoints[0].quote);
 assert.deepEqual(validate(d,{...payload,sourceReading:plan},ss),[]);
});
await test('missing and invented source IDs are rejected, never fuzzily matched or silently approved',()=>{
 const d=wire(assessment());delete d.sourceReviewById.T1P1;d.sourceReviewById.UNKNOWN={};d.learningPoints[0].sourcePointId='UNKNOWN';
 const issues=resolveSourceReferences(d,plan);
 assert(issues.some(x=>x.includes('Missing source review')));assert(issues.some(x=>x.includes('Unknown source point')));
 assert(issues.some(x=>x.includes('unknown sourcePointId')));assert(!d.sourceReview.some(r=>r.sourcePointId==='UNKNOWN'));
});
await test('focus and first learning point are reconciled using valid existing source evidence',()=>{
 const d=assessment();d.learningPoints.reverse();d.keyFocus={action:'Fix a comma.',evidenceId:punctuation,explanation:'Punctuation first.'};
 normaliseCoaching(d,ss);assert.equal(d.learningPoints[0].evidenceId,mistaken);assert.equal(d.keyFocus.evidenceId,mistaken);
 assert.equal(d.keyFocus.action,d.learningPoints[0].practiceInstruction);assert.deepEqual(validate(d,{...payload,sourceReading:plan},ss),[]);
 d.keyFocus.evidenceId='S999';normaliseCoaching(d,ss);assert.equal(d.keyFocus.evidenceId,'S999');assert(validate(d,payload,ss).length);
});
await test('new learner-facing fields carry explicit language instructions in their schemas',()=>{
 for(const lang of ['nl','es']) {
  const schema=responseSchema(ss,plan,lang),name=lang==='nl'?'Dutch':'Spanish';
  assert(schema.properties.taskReview.properties.explanation.description.includes(name));
  assert(schema.properties.learningPoints.items.anyOf[0].properties.practiceInstruction.description.includes(name));
  assert(schema.properties.sourceReviewById.properties.T1P1.properties.explanation.description.includes(name));
  assert(schema.properties.learningPoints.items.anyOf[0].properties.improvedExample.description.includes('English'));
 }
});
await test('ordinary tasks do not display task instructions as an author source',()=>{
 const d=assessment();d.taskReview.taskType='other';d.sourceReview=[{coverage:'covered',sourceQuote:'Write an email.',essayEvidenceIds:[ss[0].id]}];
 normaliseCoaching(d,ss);assert.deepEqual(d.sourceReview,[]);assert(!d.taskReview.checks.some(c=>c.requirement==='source_accuracy'));
});
await test('a recognised short English practice sentence cannot be rejected solely as unsuitable',()=>{
 const p={level:'C1',task:'Describe your morning.',essay:'This morning I have had a coffee.'},sentences=numberSentences(p.essay);
 assert.deepEqual(responseSchema(sentences).properties.sampleSuitable.enum,[true]);
 const d=assessment();d.sampleSuitable=false;
 assert(validate(d,p,sentences).some(s=>s.includes('understandable English practice sentence')));
});
console.log(`${checks} source-reference and coaching checks passed; model calls mocked.`);

const plainCompletion=d=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(d)}}]}));
const wrongReading={taskType:'other',instructionStatus:'missing',summary:'No explicit writing instructions identified.',sources:[]};
// Legacy classification disagreement remains testable on genuinely ambiguous
// instruction-plus-source input; the clear two-block case is now constrained.
const uncertainRequest=()=>new Request('https://worker.test/api/correct',{method:'POST',body:JSON.stringify({...payload,task:'Discuss these passages:\n\n'+payload.task})});
await test('classification disagreement triggers an isolated task recheck and rebuilds the source schema',async()=>{
 const bodies=[];
 globalThis.fetch=async(_,o)=>{
  bodies.push(JSON.parse(o.body));
  return bodies.length===1?plainCompletion(wrongReading):bodies.length===2?plainCompletion(assessment()):completion(bodies.length===3?plan:assessment());
 };
 const response=await worker.fetch(uncertainRequest(),env),result=await response.json();
 assert.equal(response.status,200,JSON.stringify(result));assert.equal(bodies.length,5);
 assert.deepEqual(result.diagnostics.phaseAttempts,{task:2,assessment:2,review:1});assert.equal(result.diagnostics.taskRechecks,1);
 const recheck=bodies[2];assert.equal(recheck.response_format.json_schema.name,'essaycoach_task_reading');
 assert(!JSON.stringify(recheck).includes('not widely recognized'));assert(!JSON.stringify(recheck).includes('Over these past few years'));
 assert(!recheck.messages.some(m=>m.role==='assistant'));
 assert('sourceReview' in bodies[1].response_format.json_schema.schema.properties);
 assert('sourceReviewById' in bodies[3].response_format.json_schema.schema.properties);
 assert(!bodies[3].messages.some(m=>m.role==='assistant'));
 assert.equal(result.sourceReview[1].coverage,'distorted');
});
await test('a disagreement about assumed instructions also gets a source-only recheck',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return completion(calls===1?{...plan,instructionStatus:'explicit'}:calls===3?plan:assessment());};
 const response=await worker.fetch(uncertainRequest(),env),result=await response.json();assert.equal(response.status,200,JSON.stringify(result));
 assert.equal(calls,4);assert.equal(result.taskReview.basis,'assumed');assert.equal(result.diagnostics.reusedAssessments,1);
});
await test('permanent task disagreement is bounded and returns no provisional feedback',async()=>{
 let calls=0;globalThis.fetch=async()=>plainCompletion(++calls%2?wrongReading:assessment());
 const response=await worker.fetch(uncertainRequest(),env),result=await response.json();assert.equal(response.status,502);assert.equal(calls,4);
 assert.deepEqual(result.diagnostics.phaseAttempts,{task:2,assessment:1,review:1});
 assert(result.diagnostics.issues[0].includes('disagreement'));assert(!result.nextDraft);assert(!result.learningPoints);
});
await test('a recheck still rejects fabricated source bodies instead of accepting a changed classification',async()=>{
 let calls=0;globalThis.fetch=async()=>{
  calls++;const bad=structuredClone(plan);bad.sources[0].sourceQuote='A fabricated source body that is absent from the task.';
  return plainCompletion(calls===1?wrongReading:calls===2?assessment():bad);
 };
 const response=await worker.fetch(uncertainRequest(),env),result=await response.json();assert.equal(response.status,502);assert.equal(calls,3);
 assert.equal(result.diagnostics.phase,'task');assert(!result.assessment);
});
await test('a review-stage disagreement reuses the candidate only when the literal source contract is unchanged',async()=>{
 let calls=0;globalThis.fetch=async()=>{
  calls++;if(calls===3){const d=wire(assessment());d.taskReview.taskType='other';return plainCompletion(d);}
  return completion([1,4].includes(calls)?plan:assessment());
 };
 const response=await worker.fetch(uncertainRequest(),env),result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.equal(calls,5);assert.equal(result.diagnostics.reusedAssessments,1);
 assert.deepEqual(result.diagnostics.phaseAttempts,{task:2,assessment:1,review:2});assert.equal(result.diagnostics.reviewCompleted,true);
});
await test('task reclassification does not reset the shared deadline',async()=>{
 const oldNow=Date.now;let elapsed=0,calls=0;Date.now=()=>elapsed;
 try {
  globalThis.fetch=async()=>{elapsed+=100000;return plainCompletion(++calls===1?wrongReading:assessment());};
  const response=await worker.fetch(uncertainRequest(),env),result=await response.json();assert.equal(response.status,504);assert.equal(calls,2);
  assert.equal(result.diagnostics.phase,'task');assert.equal(result.diagnostics.taskRechecks,1);
 } finally {Date.now=oldNow;}
});
console.log(`${checks} coaching checks passed; model calls mocked.`);

const observed=JSON.parse(await readFile(new URL('./fixtures/v551-gpt54-live-results.json',import.meta.url),'utf8'));
await test('server word metrics distinguish explicit limits, assumed C2 limits, and missing limits',()=>{
 assert.deepEqual(writingMetrics(payload,plan),{inputWords:256,expectedRange:{min:240,max:280,basis:'assumed'},lengthStatus:'within_range'});
 assert.equal(writingMetrics(payload).lengthStatus,'unspecified');
 const explicit={...payload,task:'Write 240–280 words.\n'+payload.task};
 assert.equal(writingMetrics(explicit).expectedRange.basis,'explicit');
 assert.equal(writingMetrics({...explicit,essay:'A short response.'}).lengthStatus,'below_range');
 assert.equal(writingMetrics({...explicit,essay:'word '.repeat(281)}).lengthStatus,'above_range');
});
await test('captured false length claims are rejected even when the rest of a C2 assessment is valid',()=>{
 const d=assessment();d.feedback=observed.explicitTask.feedback;
 assert.equal(observed.explicitTask.inputWords,256);
 assert(validate(d,{...payload,sourceReading:plan},ss).some(s=>s.includes('server word count')));
 for(const feedback of ['The essay is too short for this task.','De tekst blijft onder de gevraagde lengte.','El ensayo es demasiado corto.']) {
  d.feedback=feedback;assert(validate(d,{...payload,sourceReading:plan},ss).some(s=>s.includes('server word count')),feedback);
 }
 d.feedback='The argument needs deeper evaluation. De argumentatie is nog onvoldoende ontwikkeld.';
 assert.deepEqual(validate(d,{...payload,sourceReading:plan},ss),[]);
});
await test('word metrics are present in the first assessment and updated after source reading',async()=>{
 const bodies=[];globalThis.fetch=async(_,o)=>{bodies.push(JSON.parse(o.body));return completion(bodies.length===1?plan:assessment());};
 const response=await worker.fetch(request(),env);assert.equal(response.status,200);
 const input=JSON.parse(bodies[1].messages.find(m=>m.role==='user').content);
 assert.equal(input.writingMetrics.inputWords,256);assert.equal(input.writingMetrics.lengthStatus,'within_range');
});
await test('captured causal-for substitution cannot masquerade as a grammar correction; comma-only repair remains valid',()=>{
 const live=observed.explicitTask.edits.find(e=>e.from.includes('for parents observe'));
 const d=assessment();d.edits.push({kind:'correction',sentenceId:live.sentenceId,replacement:live.to,reason:live.reason});
 assert(validate(d,{...payload,sourceReading:plan},ss).some(s=>s.includes('replacing causal for')));
 d.edits.at(-1).replacement=live.from.replace('homeschooling for','homeschooling, for');
 d.edits.at(-1).reason='Add a comma before the coordinating conjunction for.';
 assert.deepEqual(validate(d,{...payload,sourceReading:plan},ss),[]);
});
await test('causal-for guard generalises to other subjects and preserves independent corrections',()=>{
 for(const [original,replacement] of [
  ['I stayed home for I was tired.','I stayed home because I was tired.'],
  ['We should listen, for students need support.','We should listen, as students need support.']]) {
  const local=numberSentences(original),d=assessment();d.edits=[{kind:'correction',sentenceId:'S1',replacement,reason:'Change the connector.'}];
  assert(validate(d,{...payload,essay:original},local).some(s=>s.includes('replacing causal for')));
 }
 const original='It is important for parents observe their children.',local=numberSentences(original),d=assessment();
 d.edits=[{kind:'correction',sentenceId:'S1',replacement:'It is important for parents to observe their children.',reason:'Use the infinitive after for parents.'}];
 assert(!validate(d,{...payload,essay:original},local).some(s=>s.includes('replacing causal for')));
});
console.log(`${checks} coaching checks passed; live fixtures replayed without an AI call.`);

const observed552=JSON.parse(await readFile(new URL('./fixtures/v552-live-corrections.json',import.meta.url),'utf8'));
await test('captured combined for substitutions are rejected in all three successful live essay responses',()=>{
 for(const live of Object.values(observed552.combinedCausalForEdits)) {
  const d=assessment();d.edits.push({kind:'correction',sentenceId:live.sentenceId,replacement:live.to,reason:live.reason});
  assert(validate(d,{...payload,sourceReading:plan},ss).some(s=>s.includes('replacing causal for')));
  d.edits.at(-1).replacement=live.to.replace('homeschooling because','homeschooling, for');
  assert.deepEqual(validate(d,{...payload,sourceReading:plan},ss),[]);
 }
});
await test('combined connector rejection requests a repair before any corrected draft is returned',async()=>{
 const live=observed552.combinedCausalForEdits['home-en'],bodies=[];
 globalThis.fetch=async(_,o)=>{
  bodies.push(JSON.parse(o.body));const d=assessment();
  if(bodies.length===2)d.edits.push({kind:'correction',sentenceId:live.sentenceId,replacement:live.to,reason:live.reason});
  return completion(bodies.length===1?plan:d);
 };
 const response=await worker.fetch(request(),env),result=await response.json();
 assert.equal(response.status,200,JSON.stringify(result));assert.equal(bodies.length,3);
 assert.match(bodies[2].messages.find(m=>m.role==='user').content,/even alongside other edits/);
 assert(result.nextDraft.includes('homeschooling for parents observe'));
 assert.equal(result.diagnostics.reviewCompleted,true);
});
await test('review uses a distinct audit prompt while retaining original task, essay and source evidence',async()=>{
 const bodies=[];globalThis.fetch=async(_,o)=>{bodies.push(JSON.parse(o.body));return completion(bodies.length===1?plan:assessment());};
 const response=await worker.fetch(request(),env);assert.equal(response.status,200);
 const review=bodies[2];assert.notEqual(review.messages[0].content,bodies[1].messages[0].content);
 assert.match(review.messages[0].content,/independent English writing auditor/);
 assert.match(review.messages.at(-1).content,/mutually reinforcing historical facts/);
 assert.match(review.messages[0].content,/does not require choosing a winning source/);
 const original=JSON.parse(review.messages.find(m=>m.role==='user').content);
 assert.equal(original.essay,payload.essay);assert.equal(original.task,payload.task);
 assert.equal(original.writingMetrics.inputWords,256);
 assert(JSON.stringify(original).includes(plan.sources[1].keyPoints[0].quote));
 assert.equal(review.messages.filter(m=>m.role==='assistant').length,1);
});
await test('each AI call has at most 60 seconds and cannot exceed the remaining shared deadline',async()=>{
 const oldNow=Date.now,oldTimeout=AbortSignal.timeout;let elapsed=0,calls=0;const timeouts=[];
 Date.now=()=>elapsed;AbortSignal.timeout=ms=>{timeouts.push(ms);return new AbortController().signal;};
 try {
  globalThis.fetch=async()=>{calls++;elapsed+=calls===1?50000:calls===2?110000:0;return completion(calls===1?plan:assessment());};
  const response=await worker.fetch(request(),env);assert.equal(response.status,200);
  assert.deepEqual(timeouts,[60000,60000,20000]);
 } finally {Date.now=oldNow;AbortSignal.timeout=oldTimeout;}
});
console.log(`${checks} coaching checks passed; captured edits and request flow tested with mocked model calls.`);

await test('word-length guard does not mistake negation or a short conclusion for an under-length essay',()=>{
 for(const feedback of [
  'The essay is not too short.',
  'Your response is not too long and fits the word limit.',
  'The essay is clear, but its conclusion is too short.',
  'De tekst is niet te kort.',
  'Je essay heeft een conclusie die te kort is uitgewerkt.',
  'El ensayo no es demasiado corto.',
  'El texto no es demasiado largo.',
  'El ensayo está bien, pero la conclusión es demasiado breve.'
 ]) {
  const d=assessment();d.feedback=feedback;
  assert(!validate(d,{...payload,sourceReading:plan},ss).some(s=>s.includes('server word count')),feedback);
 }
});
await test('direct false length claims still identify the exact field and wording in EN, NL and ES',()=>{
 for(const claim of ['The essay is too short.','De tekst is wel duidelijk te kort voor een C2-bronessay.','El ensayo es demasiado corto.','La respuesta se queda por debajo del límite.']) {
  const d=assessment();d.assessment.criteria.content.reason=claim;
  const issues=validate(d,{...payload,sourceReading:plan},ss).filter(s=>s.includes('server word count'));
  assert.equal(issues.length,1,claim);assert(issues[0].includes('assessment.criteria.content.reason'));
  assert(issues[0].includes('256 words; 240–280'));assert(issues[0].includes('conflicting length claim:'));
 }
 const d=assessment();d.feedback='The essay is not too short. However, the response is too long.';
 assert(validate(d,{...payload,sourceReading:plan},ss).some(s=>s.includes('response is too long')));
});
await test('a correct in-range assessment with negated length advice completes without repair calls',async()=>{
 let calls=0;globalThis.fetch=async()=>{
  calls++;const d=assessment();d.feedback='El ensayo no es demasiado corto, pero la conclusión necesita una evaluación más concreta.';
  return completion(calls===1?plan:d);
 };
 const response=await worker.fetch(request(),env),result=await response.json();
 assert.equal(response.status,200,JSON.stringify(result));assert.equal(calls,3);
 assert.equal(result.diagnostics.reviewCompleted,true);assert(result.feedback.includes('no es demasiado corto'));
});
console.log(`${checks} coaching checks passed; model calls mocked, including negation and field-specific length repair.`);

function auditedWire() {
 const d=wire(assessment());
 d.languageAudit={checkedSentenceIds:ss.map(s=>s.id),corrections:d.edits.map(e=>({sentenceId:e.sentenceId,category:'punctuation',originalQuote:ss.find(s=>s.id===e.sentenceId).text,replacementQuote:e.replacement,explanation:e.reason})),punctuationChecks:Object.fromEntries(punctuationCandidates(ss).map(c=>[c.id,{decision:d.edits.some(e=>e.sentenceId===c.sentenceId)?'correction':'valid',explanation:'The linking marker requires a delimiter in this context.'}]))};
 return d;
}
await test('C2 reviewer supplies audit evidence without redundant edits',async()=>{
 const bodies=[];globalThis.fetch=async(_,options)=>{
  bodies.push(JSON.parse(options.body));const d=bodies.length===1?structuredClone(plan):auditedWire();
  if(bodies.length===2)delete d.languageAudit;
  if(bodies.length===3)delete d.edits;
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(d)}}]}));
 };
 const r=await workerImpl.fetch(request(),env),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));
 assert(!('edits' in bodies[2].response_format.json_schema.schema.properties));
 assert(d.nextDraft.includes('however, effective'));assert(d.nextDraft.includes('not widely recognized'));
 assert.equal(d.sourceReview[1].coverage,'distorted');assert.equal(d.diagnostics.phaseAttempts.review,1);
});
await test('C2 schema requires a real source ID for interpretation and generates findings before lessons',()=>{
 const schema=responseSchema(ss,plan,'es'),branches=schema.properties.learningPoints.items.anyOf;
 assert.deepEqual(schema.properties.taskReview.properties.taskType.enum,['source_essay']);
 assert.deepEqual(schema.properties.taskReview.properties.basis.enum,['assumed']);
 assert.deepEqual(branches[0].properties.category.enum,['source_interpretation']);assert(!branches[0].properties.sourcePointId.enum.includes(''));
 assert(!branches[1].properties.category.enum.includes('source_interpretation'));assert(branches[1].properties.sourcePointId.enum.includes(''));
 assert(Object.keys(schema.properties).indexOf('sourceReviewById')<Object.keys(schema.properties).indexOf('learningPoints'));
 function strict(s){if(s.type==='object'){assert.equal(s.additionalProperties,false);assert.deepEqual(s.required,Object.keys(s.properties));Object.values(s.properties).forEach(strict);}if(s.items)strict(s.items);if(s.anyOf)s.anyOf.forEach(strict);}
 strict(schema);
});
for(const failure of ['none','punctuation','source']) await test('unwrapped C2 review preserves meaning and repairs only invalid '+failure+' evidence',async()=>{
 const bodies=[];globalThis.fetch=async(_,options)=>{
  bodies.push(JSON.parse(options.body));let d=bodies.length===1?structuredClone(plan):auditedWire();
  if(bodies.length===2)delete d.languageAudit;
  if(bodies.length===3&&failure==='punctuation'){
   const span=d.languageAudit.corrections.find(p=>p.sentenceId===punctuation);
   span.category='grammar';span.explanation='The phrase needs clearer syntax.';
  }
  if(bodies.length===3&&failure==='source')d.learningPoints[0].sourcePointId='';
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(d)}}]}));
 };
 const r=await workerImpl.fetch(request(),env),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));assert.equal(bodies.length,failure==='none'?3:4);
 assert(d.nextDraft.includes('however, effective'));assert(d.nextDraft.includes('for parents observe'));assert(d.nextDraft.includes('not widely recognized'));
 assert.equal(d.sourceReview[1].coverage,'distorted');assert.equal(d.learningPoints[0].sourceQuote,plan.sources[1].keyPoints[0].quote);
 assert(d.learningPoints[0].improvedExample.includes('challenges'));assert.equal(d.taskReview.verdict,'partly_answered');
 assert.match(bodies[1].messages[0].content,/because,\nas or since/);assert.match(bodies[2].messages[0].content,/ACTUALLY change/);
 if(failure!=='none')assert(d.diagnostics.history.find(h=>h.phase==='review').checks.some(c=>c.rule===(failure==='punctuation'?'PUNCTUATION_AUDIT':'RESPONSE_CONSISTENCY')));
});
await test('source lesson without ID still fails final validation despite schema guidance',()=>{
 const d=auditedWire();d.learningPoints[0].sourcePointId='';assert(resolveSourceReferences(d,plan).some(s=>s.startsWith('learningPoints.sourcePointId:')));
 assert(validate(d,{...payload,sourceReading:plan},ss).some(s=>s.includes('matching sourceReview quotation')));
});
console.log(`${checks} coaching checks passed including targeted v5.6.2 C2 regressions; no real AI requests.`);

for(const persistent of [false,true]) await test('C2 language lesson with shortened replacement '+(persistent?'remains rejected':'receives exact full-sentence repair'),async()=>{
 const bodies=[];
 const full=assessment().edits.find(e=>e.sentenceId===punctuation).replacement;
 globalThis.fetch=async(_,options)=>{
  bodies.push(JSON.parse(options.body));let d=bodies.length===1?structuredClone(plan):auditedWire();
  if(bodies.length===2)delete d.languageAudit;
  if(bodies.length>=3)d.learningPoints.push({category:'language',kind:'correction',evidenceId:punctuation,sourcePointId:'',issue:'Punctuate the linking adverb.',explanation:'However introduces a contrasting independent clause.',improvedExample:bodies.length===3||persistent?'however, effective budgeting':full,practiceInstruction:'Copy the sentence with the missing comma restored.',checkQuestion:'Is the linking adverb followed by a comma?'});
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(d)}}]}));
 };
 const r=await workerImpl.fetch(request(),env),d=await r.json();assert.equal(bodies.length,4);
 const first=d.diagnostics.history.find(h=>h.phase==='review');
 assert.equal(first.outcome,'validation_failed');assert(first.checks.some(c=>c.rule==='RESPONSE_CONSISTENCY'&&c.field==='learningPoints[2].improvedExample'));
 const instruction=bodies[3].messages.filter(m=>m.role==='system').map(m=>m.content).join('\n');
 assert(instruction.includes('A language correction learning point must match an actual edit and its complete replacement.'));
 assert(instruction.includes(JSON.stringify(full)));assert(instruction.includes('not a shortened fragment'));
 assert.match(bodies[2].messages[0].content,/server fills\s+improvedExample/);
 if(persistent){assert.equal(r.status,502);assert.equal(d.code,'ASSESSMENT_INCOMPLETE');assert.equal(d.nextDraft,undefined);}
 else{assert.equal(r.status,200,JSON.stringify(d));assert.equal(d.learningPoints.find(p=>p.category==='language').improvedExample,full);assert(d.nextDraft.includes(full));assert(d.nextDraft.includes('for parents observe'));assert.equal(d.sourceReview[1].coverage,'distorted');}
});
console.log(`${checks} coaching checks passed; learning-point replacement regressions use mocked AI replies.`);
