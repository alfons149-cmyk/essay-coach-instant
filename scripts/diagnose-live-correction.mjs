// One explicitly selected live request. No load generation and no credentials required here.
import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
const [inputPath,outPath='/tmp/essaycoach-live-diagnostic.json']=process.argv.slice(2);
if(!inputPath)throw new Error('Supply a JSON payload path and optional local report path. Exactly one request is made.');
const payload=JSON.parse(await readFile(inputPath,'utf8'));
const base='https://essaycoach.alfons149.workers.dev';
const h=await fetch(base+'/api/health',{signal:AbortSignal.timeout(20000)}),health=await h.json();
if(health.version!=='2026-10-19-coaching-v5.6.19')throw new Error('Expected live v5.6.19; refusing a test of a different version.');
const context={window:{}};vm.runInNewContext(await readFile(new URL('../js/correction-api.js',import.meta.url),'utf8'),context);
const started=performance.now();let response,body,transport;
try{response=await fetch(base+'/api/correct',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(190000)});body=await response.json();}
catch(e){transport=e?.name==='TimeoutError'?'CLIENT_TIMEOUT':'NETWORK';}
const report={testedAt:new Date().toISOString(),scope:'New supplied 401-word text, not a reproduction of the unconfirmed 393-word input',feedbackLanguage:payload.feedbackLanguage,wallMs:Math.round(performance.now()-started),...context.window.ECCorrectionAPI.safeFailure(response?.status,body,transport),
 inputWords:body?.inputWords,reviewCompleted:body?.diagnostics?.reviewCompleted===true};
if(response?.ok){delete report.code;report.checks={residualCommuteToTheWork:/need to commute to the work/i.test(body.nextDraft||''),residualEasyForConnect:/easy for connect/i.test(body.nextDraft||''),hasNextDraft:Boolean(body.nextDraft),edits:body.edits?.length};
 await writeFile(outPath+'.response.json',JSON.stringify(body,null,2),{mode:0o600});}
await writeFile(outPath,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report));
