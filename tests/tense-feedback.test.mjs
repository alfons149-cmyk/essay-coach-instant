// Renderer contract checks with a minimal DOM harness; not a visual browser test.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {contextNotes,numberSentences} from '../apps/worker/src/worker.js';
class Node {
 constructor(tag,doc,text=''){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.dataset={};this.hidden=false;this._text=text;}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;this._text='';}
 set textContent(text){this._text=text;this.children=[];}
 get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
}
const doc={createElement:tag=>new Node(tag,doc),createTextNode:text=>new Node('#text',doc,text),getElementById:id=>id==='nextDraftContext'?box:null};
const box=new Node('aside',doc),card=new Node('section',doc),window={};
vm.runInNewContext(await readFile(new URL('../js/tense-feedback.js',import.meta.url),'utf8'),{window,document:doc});
const original='This morning I have had a coffee.';
const notes=contextNotes({essay:original,feedbackLanguage:'nl'},numberSentences(original));
const response={schemaVersion:2,contextNotes:notes,edits:[],tenseAnalysis:[{example:original,timeFrame:'present',status:'context_needed',explanation:notes[0].explanation,forms:['present perfect simple'],signals:['This morning'],clauses:[]}]};
window.ECTenseFeedback.render(card,response,original,'nl');
assert.equal(box.hidden,false);assert.match(box.textContent,/This morning I had a coffee/);
assert.equal(card.hidden,false);assert(!card.textContent.includes('Correct gebruik'));
const li=card.children.find(n=>n.tagName==='ol').children[0];
const quoteIndex=li.children.findIndex(n=>n.tagName==='blockquote');
assert(li.children.slice(0,quoteIndex).some(n=>n.textContent===notes[0].explanation));
console.log('PASS conditional explanation precedes original; draft note visible; no valid-use badge');
window.ECTenseFeedback.render(card,{schemaVersion:2,contextNotes:[],tenseAnalysis:[]},original,'nl');
assert.equal(box.hidden,true);assert.equal(box.textContent,'');assert.equal(card.hidden,true);
console.log('PASS clearing response removes stale note and analysis');
window.ECTenseFeedback.render(card,response,'An unrelated sentence.','nl');
assert.equal(box.hidden,true);assert.equal(card.hidden,true);
console.log('PASS notes and quotations must match the current original');
const unsafe=structuredClone(response);unsafe.contextNotes[0].explanation='<img src=x onerror=alert(1)>';
window.ECTenseFeedback.render(card,unsafe,original,'nl');
assert(box.textContent.includes('<img'));assert(box.children.every(n=>n.tagName!=='img'));
console.log('PASS model text is rendered as text, not HTML');
const {buildSignalHints}=await import('../apps/worker/src/worker.js');
const focused={schemaVersion:2,feedbackMode:'focused',contextNotes:notes,signalHints:buildSignalHints({essay:original,feedbackLanguage:'nl'},numberSentences(original)),tenseAnalysis:[{example:original,timeFrame:'present',status:'correct',explanation:'STALE ANALYSIS',forms:['OLD FORM'],signals:['This morning']}]};
window.ECTenseFeedback.render(card,focused,original,'nl');
assert.equal(card.hidden,false);assert(card.textContent.includes('Signaalwoorden — korte uitleg'));
assert(!card.textContent.includes('STALE ANALYSIS'));assert(!card.textContent.includes('OLD FORM'));assert(!card.textContent.includes('Correct gebruik'));
assert(card.textContent.includes('This morning I had a coffee.'));assert.equal(box.hidden,false);
console.log('PASS focused mode shows fixed reminders and never old tense labels or approval badges');
window.ECTenseFeedback.render(card,{schemaVersion:2,feedbackMode:'focused',signalHints:[],contextNotes:[]},original,'nl');
assert.equal(card.hidden,true);assert.equal(box.hidden,true);
console.log('PASS no signals means no empty analysis card');
