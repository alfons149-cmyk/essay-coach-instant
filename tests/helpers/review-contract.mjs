// Legacy mock adaptation only. Whole-sentence witnesses are synthetic and do NOT
// prove linguistic correctness. New audit tests use the unwrapped Worker.
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
   data.languageAudit={checkedSentenceIds:ss.map(s=>s.id),corrections:(data.edits||[]).filter(e=>e.kind==='correction').map(e=>({sentenceId:e.sentenceId,category:'punctuation',originalQuote:ss.find(s=>s.id===e.sentenceId)?.text||'invalid fixture ID',replacementQuote:e.replacement,explanation:e.reason})),
    punctuationChecks:Object.fromEntries((input.punctuationCandidates||[]).map(c=>[c.id,{decision:data.edits?.some(e=>e.sentenceId===c.sentenceId)?'correction':'valid',explanation:'Synthetic legacy fixture; not a real model judgement.'}]))};
   result.choices[0].message.content=JSON.stringify(data);return new Response(JSON.stringify(result),{status:response.status,headers:response.headers});
  };
  try{return await worker.fetch(request,env);}finally{globalThis.fetch=provider;}
 }};
}
