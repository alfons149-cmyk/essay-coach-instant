export default {
async fetch(request, env) {
const url = new URL(request.url);
const cors = { 'Access-Control-Allow-Origin': env.CORS_ORIGIN||'*', 'Access-Control-Allow-Headers':'*' };
if (request.method === 'OPTIONS') return new Response(null,{headers:cors});


if (url.pathname === '/api/health') {
return new Response(JSON.stringify({ok:true, ts:Date.now()}), {headers:{'Content-Type':'application/json',...cors}});
}


if (url.pathname === '/api/correct' && request.method === 'POST') {
const req = await request.json();
const wc = (req.studentText||'').trim().split(/\s+/).filter(Boolean).length;
const map={B2:{min:140,max:190}, C1:{min:220,max:260}, C2:{min:240,max:280}};
const t = map[req.level]||map.C1; const status = wc<t.min? 'low' : wc>t.max? 'high' : 'ok';
const resp = {
meta:{level:req.level||'C1',taskType:req.taskType||'essay',processingMs:5,model:'worker:mock',version:'ec-worker-mock'},
counts:{words:wc, sentences: Math.max(1,Math.floor(wc/15)), paragraphs: Math.max(1,Math.floor(wc/90))},
wordCountCheck:{min:t.min,max:t.max,status},
scores:{
content:{band:3,explanation:'Addresses most parts of the task.'},
communicativeAchievement:{band:3,explanation:'Register mostly consistent.'},
organisation:{band:3,explanation:'Logical flow with minor issues.'},
language:{band:3,explanation:'Some inaccuracies but generally clear.'}
},
overall:{band:3,label:`Borderline pass ${req.level||'C1'}`},
edits:[{span:{start:0,end:0,text:''},type:'lexis',suggestion:'considerable',explanation:'Prefer formal register.'}],
inlineDiff:'', cohesion:{linkers:['Firstly','Moreover','However']}, register:{issues:[],tone:'mostly formal'},
nextDraft:{priorities:['Clarify thesis','Improve paragraph openers','Fix comma splices (if any)']}
};
return new Response(JSON.stringify(resp), {headers:{'Content-Type':'application/json',...cors}});
}


return new Response('Not Found', {status:404, headers:cors});
}
}