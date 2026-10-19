import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context={window:{},AbortController,setTimeout,clearTimeout,fetch};
vm.runInNewContext(await readFile(new URL('../js/correction-api.js',import.meta.url),'utf8'),context);
const api=context.window.ECCorrectionAPI;
let checks=0;
async function test(name,fn){await fn();checks++;console.log('PASS',name);}
const body={code:'ASSESSMENT_INCOMPLETE',version:'2026-10-19-coaching-v5.6.19',error:'SECRET provider error',essay:'PRIVATE essay',diagnostics:{phase:'review',totalMs:85000,attempts:4,phaseAttempts:{task:1,assessment:1,review:2},history:[{phase:'review',attempt:1,durationMs:30000,providerMs:29900,validationMs:100,outcome:'validation_failed',checks:[{field:'languageAudit.corrections[2].originalQuote',rule:'ORIGINAL_EVIDENCE',message:'PRIVATE essay quotation'},{field:'edits[0].replacement',rule:'UNEXPLAINED_CHANGE',message:'SECRET'}]}],completions:[{phase:'review',finishReason:'length',completionTokens:6000,maxCompletionTokens:6000}],issues:['PRIVATE'],taskRecheck:{secret:'SECRET'}}};
await test('502 keeps status phase timing rules and token limit without content',async()=>{
 let error;try{await api.request('https://test',{}, {fetchImpl:async()=>new Response(JSON.stringify(body),{status:502})});}catch(e){error=e;}
 assert.equal(error.safeReport.httpStatus,502);assert.equal(error.safeReport.phase,'review');assert.equal(error.safeReport.totalMs,85000);assert.equal(error.safeReport.history[0].checks[0].rule,'ORIGINAL_EVIDENCE');assert.equal(error.safeReport.completions[0].finishReason,'length');
 assert(!JSON.stringify(error).includes('SECRET'));assert(!JSON.stringify(error).includes('PRIVATE'));assert(!error.message.includes('provider'));
 for(const lang of ['nl','en','es']){const msg=api.message(error.safeReport,lang);assert(msg.includes('502'));assert(msg.includes('review'));assert(msg.includes('ASSESSMENT_INCOMPLETE'));}
});
await test('unknown codes fields and enums cannot smuggle provider or essay text',()=>{
 const safe=api.safeFailure(502,{code:'SECRET',version:'SECRET',diagnostics:{phase:'SECRET',history:[{phase:'SECRET',outcome:'SECRET',checks:[{field:'learningPoints.SECRET',rule:'SECRET',message:'SECRET'}]}]}});
 assert(!JSON.stringify(safe).includes('SECRET'));assert.equal(safe.code,'HTTP_ERROR');
});
await test('safe learning-point paths remain recognisable without leaking arbitrary fields',()=>{
 const fields=['learningPoints[1].practiceInstruction','learningPoints[1].issue','learningPoints[1].PRIVATE','learningPoints[1].issue PRIVATE'];
 const safe=api.safeFailure(502,{code:'ASSESSMENT_INCOMPLETE',diagnostics:{history:[{phase:'assessment',checks:fields.map(field=>({field,rule:'EXISTING_SUPPORT',message:'SECRET'}))}]}});
 assert.equal(safe.history[0].checks[0].field,fields[0]);assert.equal(safe.history[0].checks[1].field,fields[1]);
 assert.equal(safe.history[0].checks[2].field,'unknown');assert.equal(safe.history[0].checks[3].field,'unknown');assert(!JSON.stringify(safe).includes('SECRET'));assert(!JSON.stringify(safe).includes('PRIVATE'));
});
for(const status of [429,503,504])await test('HTTP '+status+' remains a failure even with non-JSON provider text',async()=>{
 await assert.rejects(api.request('https://test',{}, {fetchImpl:async()=>new Response('PRIVATE raw provider text',{status})}),e=>e.safeReport.httpStatus===status&&!JSON.stringify(e).includes('PRIVATE'));
});
await test('invalid or empty HTTP 200 cannot masquerade as a completed assessment',async()=>{
 for(const data of [{}, {schemaVersion:2,nextDraft:'',edits:[],diagnostics:{reviewCompleted:true}}, {schemaVersion:2,nextDraft:'Text',edits:[],diagnostics:{reviewCompleted:false}}])
  await assert.rejects(api.request('https://test',{}, {fetchImpl:async()=>new Response(JSON.stringify(data))}),e=>e.safeReport.code==='INVALID_RESPONSE');
});
await test('validated success is passed through unchanged',async()=>{
 const data={schemaVersion:2,nextDraft:'Valid writing.',edits:[],diagnostics:{reviewCompleted:true}};
 assert.equal(JSON.stringify(await api.request('https://test',{}, {fetchImpl:async()=>new Response(JSON.stringify(data))})),JSON.stringify(data));
});
await test('network error does not expose its message or automatically retry',async()=>{
 let calls=0;await assert.rejects(api.request('https://test',{}, {fetchImpl:async()=>{calls++;throw new Error('SECRET');}}),e=>e.safeReport.code==='NETWORK'&&!JSON.stringify(e).includes('SECRET'));assert.equal(calls,1);
});
const pending=(_,options)=>new Promise((resolve,reject)=>{if(options.signal.aborted)reject(new DOMException('Aborted','AbortError'));else options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});});
await test('client timeout is bounded and distinct from server TIMEOUT',async()=>{
 await assert.rejects(api.request('https://test',{}, {timeoutMs:5,fetchImpl:pending}),e=>e.safeReport.code==='CLIENT_TIMEOUT'&&e.safeReport.httpStatus===null);
});
await test('explicit cancellation is distinguished from a connection failure',async()=>{
 const controller=new AbortController();controller.abort();await assert.rejects(api.request('https://test',{}, {signal:controller.signal,fetchImpl:pending}),e=>e.safeReport.code==='CANCELLED');
});
console.log(`${checks} safe API client checks passed; mocked HTTP only.`);
