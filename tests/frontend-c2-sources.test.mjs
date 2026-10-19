import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the actual browser handlers against a small DOM and intercepted API.
function element(id='',value='') {
  const listeners={};
  return {id,value,hidden:false,textContent:'',innerHTML:'',disabled:false,
    listeners,classList:{toggle(){},add(){},remove(){}},
    addEventListener(type,fn){listeners[type]=fn;},
    getAttribute(name){return name==='data-level'?this.level:name==='data-lang'?this.language:null;},
    setAttribute(){},removeAttribute(){},closest(){return null;},replaceChildren(){this.textContent='';},appendChild(){}};
}
const ids=Object.fromEntries(['task','c2Sources','sourceOne','sourceTwo','essay','btnCorrect','btnClear','feedback','writingCoachCard','statusLine','nextDraft','bandsCard','edits']
  .map(id=>[id,element(id)]));
const levels=['B2','C1','C2'].map(level=>Object.assign(element(),{level}));
const languages=['en','es','nl'].map(language=>Object.assign(element(),{language}));
const documentListeners={},requests=[],renders=[];
const document={documentElement:{lang:'en'},title:'',
  querySelector:selector=>ids[selector.slice(1)]||null,
  querySelectorAll:selector=>selector==='[data-level]'?levels:selector==='[data-lang]'?languages:[],
  getElementById:id=>ids[id]||null,
  createElement:tag=>element(tag),
  addEventListener(type,fn){documentListeners[type]=fn;}};
const values=new Map([['ec.level','C1']]);
const localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
const context={document,localStorage,location:{search:''},URLSearchParams,console,
  setTimeout:(fn,ms)=>ms===190000?setTimeout(fn,ms):fn(),clearTimeout,AbortController,Event:class{},
  async fetch(_,options){
    requests.push(JSON.parse(options.body));
    return {ok:true,async text(){return JSON.stringify({schemaVersion:2,diagnostics:{reviewCompleted:true},feedback:'OK',nextDraft:ids.essay.value,edits:[]});}};
  }};
context.window=context;
context.EC={DEV:false,API_BASE:'https://worker.test/api'};
context.ECWritingCoach={render:(_,__,essay,task,language)=>renders.push({essay,task,language})};
vm.runInNewContext(await readFile(new URL('../js/i18n.js',import.meta.url),'utf8'),context);
vm.runInNewContext(await readFile(new URL('../js/correction-api.js',import.meta.url),'utf8'),context);
vm.runInNewContext(await readFile(new URL('../js/app.js',import.meta.url),'utf8'),context);
documentListeners.DOMContentLoaded();
const click=button=>button.listeners.click({target:button});

assert.equal(ids.c2Sources.hidden,true);
await click(levels[2]);
assert.equal(ids.c2Sources.hidden,false);
ids.task.value='Write an essay comparing the two passages.';
ids.sourceOne.value='A complete first source passage with a clear claim and sufficient context.';
ids.sourceTwo.value='A different second source passage with a separate argument and supporting context.';
ids.essay.value='My essay considers the two different positions.';
await click(ids.btnCorrect);
assert.equal(requests.length,1);
assert.equal(requests[0].task,ids.task.value);
assert.deepEqual(Array.from(requests[0].sourceBodies),[ids.sourceOne.value,ids.sourceTwo.value]);
assert(renders[0].task.includes(ids.sourceOne.value));
assert(renders[0].task.includes(ids.sourceTwo.value));
assert(renders[0].task.includes(ids.task.value));

await click(languages[2]);await Promise.resolve();
assert.equal(renders.at(-1).task,renders[0].task);
assert.equal(renders.at(-1).language,'nl');
ids.sourceTwo.value='';
await click(ids.btnCorrect);
assert.equal(requests.length,1);
assert.match(ids.feedback.textContent,/beide|twee verschillende/i);

ids.sourceTwo.value=ids.sourceOne.value;
await click(ids.btnCorrect);
assert.equal(requests.length,1);
ids.sourceTwo.value='Another complete source passage that differs from the first in its central claim.';
ids.task.value=ids.sourceOne.value;
await click(ids.btnCorrect);
assert.equal(requests.length,1);
assert.match(ids.feedback.textContent,/schrijfinstructies/i);

ids.task.value='Write about the topic.';
await click(levels[1]);
assert.equal(ids.c2Sources.hidden,true);
await click(ids.btnCorrect);
assert.equal(requests.length,2);
assert.equal('sourceBodies' in requests[1],false);
await click(levels[2]);
assert.equal(ids.sourceOne.value.length>0,true);
await click(ids.btnClear);
assert.equal(ids.sourceOne.value,'');assert.equal(ids.sourceTwo.value,'');
assert.equal(ids.task.value,'');assert.equal(ids.essay.value,'');
ids.task.value='Text 1\nThe first source argues that the costs matter.\n\nText 2\nThe second source describes practical support.';
ids.essay.value='Both sources make relevant points about homeschooling.';
await click(ids.btnCorrect);
assert.equal(requests.length,3);
assert.equal('sourceBodies' in requests[2],false);
assert.equal(renders.at(-1).task,ids.task.value);
console.log('PASS C2 source payload, citation context after language switch, invalid input, level switch and clear');

const beforeRenders=renders.length;ids.nextDraft.value='Stale draft';ids.bandsCard.hidden=false;
context.fetch=async()=>({ok:false,status:502,text:async()=>JSON.stringify({code:'ASSESSMENT_INCOMPLETE',error:'SECRET provider content',diagnostics:{phase:'review',totalMs:85000,history:[{phase:'review',outcome:'validation_failed',checks:[{field:'edits[0].replacement',rule:'UNEXPLAINED_CHANGE',message:'PRIVATE essay'}]}]}})});
await click(ids.btnCorrect);
assert(ids.feedback.textContent.includes('ASSESSMENT_INCOMPLETE'));assert(ids.feedback.textContent.includes('review'));assert(ids.feedback.textContent.includes('502'));
assert.equal(ids.nextDraft.value,'');assert.equal(ids.bandsCard.hidden,true);assert.equal(renders.length,beforeRenders);assert.equal(context.EC_LAST_RESPONSE,null);assert.equal(ids.writingCoachCard.hidden,true);assert.equal(ids.btnCorrect.disabled,false);
assert(!JSON.stringify(context.EC_LAST_FAILURE).includes('PRIVATE'));assert(!JSON.stringify(context.EC_LAST_FAILURE).includes('SECRET'));
console.log('PASS failed API response has safe code and phase, no successful or stale cards');
context.fetch=async()=>({ok:true,status:200,text:async()=>'{"schemaVersion":2}'});
await click(ids.btnCorrect);assert(ids.feedback.textContent.includes('INVALID_RESPONSE'));assert.equal(renders.length,beforeRenders);
console.log('PASS incomplete HTTP 200 does not render empty success');
let unblock,calls=0;
context.fetch=async()=>{calls++;await new Promise(resolve=>unblock=resolve);return {ok:true,status:200,text:async()=>JSON.stringify({schemaVersion:2,feedback:'OK',nextDraft:ids.essay.value,edits:[],diagnostics:{reviewCompleted:true}})};};
const running=click(ids.btnCorrect);await click(ids.btnCorrect);assert.equal(calls,1);unblock();await running;
assert.equal(context.EC_LAST_FAILURE,null);assert.equal(renders.length,beforeRenders+1);
console.log('PASS duplicate submit is suppressed and a valid success clears the failure');
