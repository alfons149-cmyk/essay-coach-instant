// Real AI measurement; one local request by default, no credentials read/printed.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const options={base:'http://127.0.0.1:8787',case:'homeschooling',language:'es',repeat:'1','expected-version':'2026-10-18-coaching-v5.6.6',out:'/tmp/essaycoach-live'};
for(let i=2;i<process.argv.length;i+=2){const name=process.argv[i].replace(/^--/,'');if(!Object.hasOwn(options,name)||!process.argv[i+1])throw new Error('Use --base, --case, --language, --repeat, --expected-version or --out with a value.');options[name]=process.argv[i+1];}
const repeats=Number(options.repeat),base=new URL(options.base);
if(!Number.isInteger(repeats)||repeats<1||repeats>10||!['en','nl','es'].includes(options.language))throw new Error('Use 1–10 repetitions and language en/nl/es.');
if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash)throw new Error('Use a service origin without credentials.');
const names={university:0,museum:1,energy:2,library:3};
let input;
if(options.case==='homeschooling')input=JSON.parse(await readFile(new URL('../tests/fixtures/homeschooling-c2.json',import.meta.url),'utf8'));
else if(['c1','c1-wrong-task'].includes(options.case)){input=JSON.parse(await readFile(new URL('../tests/fixtures/c1-environment-v562.json',import.meta.url),'utf8'));if(options.case==='c1-wrong-task')input.task=input.wrongTask;}
else if(Object.hasOwn(names,options.case))input=JSON.parse(await readFile(new URL('../tests/fixtures/language-audit-cases.json',import.meta.url),'utf8'))[names[options.case]];
else throw new Error('Case must be homeschooling, university, museum, energy, library, c1 or c1-wrong-task.');
const payload={essay:input.essay,task:input.task,level:input.level,feedbackLanguage:options.language};
const hr=await fetch(new URL('/api/health',base),{signal:AbortSignal.timeout(20000)});if(!hr.ok)throw new Error('Health HTTP '+hr.status);
const health=await hr.json(),safeHealth={version:health.version,model:health.model??null,modelSource:health.modelSource??null,apiKeyConfigured:health.apiKeyConfigured??null};
console.log(JSON.stringify(safeHealth));
if(health.version!==options['expected-version'])throw new Error('Unexpected Worker version; refusing a test of the wrong deployment.');
if(health.apiKeyConfigured===false)throw new Error('OpenAI binding is missing; configure it securely in Cloudflare.');
await mkdir(options.out,{recursive:true});let failures=0;
for(let run=1;run<=repeats;run++){
 const started=performance.now();let response,result;
 try{response=await fetch(new URL('/api/correct',base),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(190000)});result=await response.json();}catch(error){result={code:'LIVE_RUNNER_CONNECTION',error:error.name};}
 const checks={successfulResponse:response?.status===200,version:result.version===options['expected-version']};
 if(response?.status===200){
  checks.independentReview=result.diagnostics?.reviewCompleted===true;checks.auditPresent=Array.isArray(result.languageAudit?.checkedSentenceIds);
  if(options.case==='homeschooling'){
   checks.howeverComma=result.nextDraft?.includes('however, effective budgeting')===true;
   checks.preserveHead=result.nextDraft?.includes('a teacher and a head')===true;
   checks.preserveCausalFor=/homeschooling,? for parents observe/.test(result.nextDraft||'');
   checks.sourceDistortionReported=result.sourceReview?.some(r=>r.coverage==='distorted')===true;
   checks.assumedInstructions=result.taskReview?.basis==='assumed';checks.serverWordCount=result.inputWords===256;
  }
  if(['c1','c1-wrong-task'].includes(options.case))checks.taskVerdict=result.taskReview?.verdict===(options.case==='c1'?'answered':'not_answered');
  if(['energy','c1','c1-wrong-task'].includes(options.case))checks.correctTextUnchanged=result.nextDraft===payload.essay;
  if(options.case==='museum'){
   checks.pastAction=result.nextDraft?.includes('and bought a ticket')===true;
   checks.preserveRead=result.nextDraft?.includes('I read the exhibition guide last night.')===true;
   checks.preserveMorning=result.nextDraft?.includes('This morning I have had a coffee.')===true;
   checks.morningCondition=result.contextNotes?.length===1;
  }
 }
 const summary={case:options.case,language:options.language,run,httpStatus:response?.status??null,elapsedMs:Math.round(performance.now()-started),version:result.version??null,model:result.diagnostics?.model??null,totalMs:result.diagnostics?.totalMs??null,phaseMs:result.diagnostics?.phaseMs??null,phaseAttempts:result.diagnostics?.phaseAttempts??null,checks,humanReviewRequired:'Assess linguistic necessity, explanations, source interpretation, evaluation, missed errors and feedback language. Spot checks do not prove correctness.'};
 const file=resolve(options.out,`${options.case}-${options.language}-${Date.now()}-${run}.json`);
 await writeFile(file,JSON.stringify({summary,health:safeHealth,input:payload,response:result},null,2)+'\n');console.log(JSON.stringify({...summary,resultFile:file}));
 if(Object.values(checks).some(value=>value!==true))failures++;
}
process.exitCode=failures?1:0;
