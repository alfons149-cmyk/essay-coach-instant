import assert from 'node:assert/strict';
import worker,{numberSentences,constructAuditedEdits,languageAuditIssues,correctedSentenceIssues,surfaceCandidates,sourceOrderIssues} from '../apps/worker/src/worker.js';
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
for(const persistent of [false,true])await test('construction failure '+(persistent?'fails closed without derivative cascades':'repairs the exact local cause before checking lessons'),async()=>{
 const bodies=[];globalThis.fetch=async(_,o)=>{bodies.push(JSON.parse(o.body));return completion(reply(bodies.length>1,bodies.length>2&&!persistent));};
 const r=await worker.fetch(request(),{OPENAI_API_KEY:'mock'}),d=await r.json();assert.equal(bodies.length,3);assert.equal(r.status,persistent?502:200,JSON.stringify(d));
 const first=d.diagnostics.history.find(h=>h.phase==='review');assert.equal(first.checks.length,1);assert.equal(first.checks[0].rule,'EVIDENCE_GRANULARITY');assert(!first.checks.some(c=>c.message.includes('matching correction edit')));
 const repair=JSON.parse(bodies[2].messages.find(m=>m.role==='user'&&m.content.includes('"auditRepair"')).content).auditRepair;
 assert.equal(repair.issues.length,1);assert.equal(repair.sentences[0].spans[0].localChangeHints.length,3);
 for(const hint of repair.sentences[0].spans[0].localChangeHints)assert(original.includes(hint.originalQuote));
 if(persistent){assert.equal(d.nextDraft,undefined);assert.equal(d.diagnostics.reviewCompleted,false);}
 else{assert.equal(d.nextDraft,corrected);assert.equal(d.learningPoints[0].improvedExample,corrected);assert.equal(d.diagnostics.completions[0].promptTokens,200);}
 assert(bodies[0].messages[0].content.includes('does NOT prescribe their order'));
 assert(bodies[1].messages[0].content.includes('one optional approach'));
});
await test('correct local evidence reconstructs every change; unexplained extra changes still fail',()=>{
 const d=reply(true,true),ss=numberSentences(original);assert.deepEqual(constructAuditedEdits(d,ss),[]);assert.deepEqual(languageAuditIssues(d,ss),[]);d.edits[0].replacement+=' This always works.';assert(languageAuditIssues(d,ss).some(s=>s.includes('EVERY change')));
});
await test('both reported partial corrections are rejected as complete corrected sentences',()=>{
 for(const replacement of ['People can wake up later because they don’t need to commute to the work.','Nowadays, everyone has a laptop and internet, so it is easy for connect with other people.'])
  assert(correctedSentenceIssues({edits:[{kind:'correction',sentenceId:'S1',replacement}]}).length);
});
await test('correct infinitives institutional work and work-site counterexamples remain valid',()=>{
 for(const replacement of ['People do not need to commute to work.','I commute to the work site.','It is easy to connect with other people.','It is easy for students to connect with other people.','Access is difficult for children.','It is possible to learn online.'])assert.deepEqual(correctedSentenceIssues({edits:[{kind:'correction',sentenceId:'S1',replacement}]}),[],replacement);
 assert(surfaceCandidates(numberSentences('It is difficult for learn English.')).some(c=>c.kind==='adjective_infinitive'));
 assert(surfaceCandidates(numberSentences('It is possible for communicate online.')).some(c=>c.kind==='adjective_infinitive'));
});
await test('request body is bounded before JSON parsing and any model calls',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('Must not call provider');};
 for(const headers of [{},{'Content-Length':'600000'}]){
  const r=await worker.fetch(new Request('https://test/api/correct',{method:'POST',headers,body:'x'.repeat(524289)}),{OPENAI_API_KEY:'mock'});assert.equal(r.status,413);assert.equal((await r.json()).code,'TOO_LARGE_BODY');
 }assert.equal(calls,0);
});
await test('provider rate limiting preserves safe status and Retry-After without retries or text',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return new Response('SECRET provider detail',{status:429,headers:{'Retry-After':'12'}});};
 const r=await worker.fetch(request(),{OPENAI_API_KEY:'mock'}),d=await r.json();assert.equal(r.status,503);assert.equal(d.code,'AI_RATE_LIMITED');assert.equal(d.upstreamStatus,429);assert.equal(r.headers.get('Retry-After'),'12');assert.equal(calls,1);assert(!JSON.stringify(d).includes('SECRET'));assert.equal(d.nextDraft,undefined);
});
await test('source task does not invent a mandatory sequence; optional integrated structures stay valid',()=>{
 const payload={task:'Summarise and evaluate the two sources and include your own ideas.'};
 const check=explanation=>sourceOrderIssues({taskReview:{taskType:'source_essay'},learningPoints:[{explanation}]},payload);
 for(const claim of ['Your own opinion is allowed only after a neutral summary.','Je eigen mening mag wel, maar pas nadat je eerst duidelijk hebt gemaakt wat beide teksten beweren.','Tu opinión se permite solo después de resumir las fuentes.'])assert(check(claim).length);
 for(const advice of ['One possible structure is to summarise first and evaluate afterwards.','Je kunt samenvatting en evaluatie combineren.','Your own opinion does not need to come only after a summary.','You can integrate your own position with the source evaluation.'])assert.deepEqual(check(advice),[]);
 assert.deepEqual(sourceOrderIssues({taskReview:{taskType:'source_essay'},feedback:'You must summarise before giving your opinion.'},{task:'First summarise the sources, then give your opinion.'}),[]);
});
console.log(`${checks} v5.6.20 checks passed; all provider responses mocked.`);
