// LOCAL ONLY: replaces fetch completely; cannot call Cloudflare or OpenAI.
import worker from '../apps/worker/src/worker.js';
import {payload,plan,auditedWire} from '../tests/helpers/load-provider.mjs';
import {writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
const requests=Number(process.argv[2]||80),concurrency=Number(process.argv[3]||20),delayMs=Number(process.argv[4]||5);
const scenario=process.argv[5]||'valid',out=process.argv[6]||'/tmp/essaycoach-load.json';
if(!Number.isInteger(requests)||requests<1||requests>1000||!Number.isInteger(concurrency)||concurrency<1||concurrency>200||!Number.isFinite(delayMs)||delayMs<0||delayMs>1000||!['valid','repair','invalid','rate','unavailable','timeout'].includes(scenario))throw new Error('Use requests 1..1000, concurrency 1..200, delay 0..1000 ms, valid/repair/invalid/rate/unavailable/timeout, output path');
let providerCalls=0,active=0,peak=0,promptBytes=0;
const saved=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(url!=='https://api.openai.com/v1/chat/completions')throw new Error('Unexpected endpoint; network is disabled in this mock');
 providerCalls++;active++;peak=Math.max(peak,active);
 try{
  await new Promise(resolve=>setTimeout(resolve,delayMs));
  if(scenario==='timeout')throw new DOMException('Synthetic timeout','TimeoutError');
  if(scenario==='rate'||scenario==='unavailable')return new Response('Private upstream text',{status:scenario==='rate'?429:503});
  const b=JSON.parse(options.body);promptBytes+=Buffer.byteLength(JSON.stringify(b.messages));
  const schema=b.response_format.json_schema.schema,review=Boolean(schema.properties.languageAudit),task=b.response_format.json_schema.name==='essaycoach_task_reading';
  let result=task?structuredClone(plan):auditedWire();
  if(!task&&!review)delete result.languageAudit;
  const retry=b.messages.some(m=>m.role==='system'&&m.content.includes('Repair these defects'));
  if(review&&(scenario==='invalid'||scenario==='repair'&&!retry))result.languageAudit.checkedSentenceIds=[];
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(result)}}]}));
 }finally{active--;}
};
const latency=[],statuses={},codes={},phases={},rejections={};let next=0,unsafeDrafts=0,unexpected=0;
const started=performance.now(),cpuStart=process.cpuUsage(),heapStart=process.memoryUsage().heapUsed;
try{
 await Promise.all(Array.from({length:Math.min(concurrency,requests)},async()=>{
  while(next++<requests){const t=performance.now();
   const r=await worker.fetch(new Request('https://local.invalid/api/correct',{method:'POST',body:JSON.stringify(payload)}),{OPENAI_API_KEY:'MOCK_ONLY',OPENAI_MODEL:'gpt-5.4'});
   const d=await r.json();latency.push(performance.now()-t);statuses[r.status]=(statuses[r.status]||0)+1;
   if(d.code)codes[d.code]=(codes[d.code]||0)+1;
   for(const [p,n] of Object.entries(d.diagnostics?.phaseAttempts||{}))phases[p]=(phases[p]||0)+n;
   for(const h of d.diagnostics?.history||[])for(const c of h.checks||[])rejections[c.rule]=(rejections[c.rule]||0)+1;
   if(r.status!==200&&d.nextDraft!==undefined)unsafeDrafts++;
   const expected=['valid','repair'].includes(scenario)?200:scenario==='timeout'?504:scenario==='rate'?503:502;
   if(r.status!==expected||r.status===200&&d.diagnostics?.reviewCompleted!==true)unexpected++;
  }
 }));
}finally{globalThis.fetch=saved;}
const durationMs=performance.now()-started,cpu=process.cpuUsage(cpuStart);latency.sort((a,b)=>a-b);
const percentile=p=>Math.round(latency[Math.min(latency.length-1,Math.ceil(latency.length*p)-1)]*100)/100;
const report={scope:'LOCAL NODE MOCK ONLY; not Cloudflare or real OpenAI capacity',node:process.version,scenario,requests,concurrency,providerDelayMs:delayMs,durationMs:Math.round(durationMs),throughputPerSecond:Math.round(requests*1000/durationMs*100)/100,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),providerCalls,peakProviderConcurrency:peak,promptBytes,phaseAttempts:phases,statuses,codes,rejections,unsafeDrafts,unexpected,cpuMs:(cpu.user+cpu.system)/1000,heapDeltaBytes:process.memoryUsage().heapUsed-heapStart};
await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
if(unsafeDrafts||unexpected)process.exitCode=1;
