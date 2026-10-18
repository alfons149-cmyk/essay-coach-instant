// Legacy mock adaptation only. These synthetic witnesses prove reconstruction,
// not linguistic correctness. New audit tests use the unwrapped Worker.
import {evidenceChanges} from '../../apps/worker/src/worker.js';

export function syntheticSpans(original,replacement,sentenceId,candidates) {
 return evidenceChanges(original,replacement).map(p=>{
  let start=Math.max(0,p.start-15),end=Math.min(original.length,p.end+15);
  const marker=candidates.find(c=>c.sentenceId===sentenceId&&p.start<=c.offset+c.marker.length+1&&p.end>=c.offset);
  if(marker) {start=Math.min(start,marker.offset);end=Math.max(end,marker.offset+marker.marker.length);}
  let quote=original.slice(start,end);
  while(original.indexOf(quote)!==original.lastIndexOf(quote)) {
   if(start>0)start--;else if(end<original.length)end++;else break;
   quote=original.slice(start,end);
  }
  const punctuation=Boolean(marker)||/^[,;:.!?\s]*$/.test(original.slice(p.start,p.end)+p.replacementQuote);
  return {sentenceId,category:punctuation?'punctuation':'grammar',originalQuote:quote,
   replacementQuote:original.slice(start,p.start)+p.replacementQuote+original.slice(p.end,end),
   explanation:'Synthetic legacy fixture; not a real model judgement.'};
 });
}
export function withReviewContract(worker) {
 return {async fetch(request,env){
  const provider=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{
   const response=await provider(url,options),body=JSON.parse(options.body);
   if(!response.ok||!body.response_format?.json_schema?.schema?.properties?.languageAudit)return response;
   let result,data;
   try{result=await response.clone().json();data=JSON.parse(result.choices[0].message.content);}catch{return response;}
   if(data.languageAudit!==undefined)return response;
   const input=JSON.parse(body.messages.find(m=>m.role==='user').content),ss=input.sentences.filter(s=>s.text.length>=8||/[.!?]$/.test(s.text));
   data.languageAudit={checkedSentenceIds:ss.map(s=>s.id),corrections:(data.edits||[]).filter(e=>e.kind==='correction').flatMap(e=>syntheticSpans(ss.find(s=>s.id===e.sentenceId)?.text||'invalid fixture ID',e.replacement,e.sentenceId,input.punctuationCandidates||[])),
    punctuationChecks:Object.fromEntries((input.punctuationCandidates||[]).map(c=>[c.id,{decision:data.edits?.some(e=>e.sentenceId===c.sentenceId)?'correction':'valid',explanation:'Synthetic legacy fixture; not a real model judgement.'}]))};
   result.choices[0].message.content=JSON.stringify(data);return new Response(JSON.stringify(result),{status:response.status,headers:response.headers});
  };
  try{return await worker.fetch(request,env);}finally{globalThis.fetch=provider;}
 }};
}
