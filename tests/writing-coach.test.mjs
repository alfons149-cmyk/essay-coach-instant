import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
// Minimal DOM harness: tests rendering contracts, not browser layout.
class Node {
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.hidden=false;this._text='';}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;this._text='';}
 set textContent(t){this._text=t;this.children=[];}
 get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
}
const doc={createElement:tag=>new Node(tag,doc),getElementById:id=>id==='nextDraftTaskContext'?draft:null};
const draft=new Node('aside',doc),card=new Node('section',doc),window={};
vm.runInNewContext(await readFile(new URL('../js/writing-coach.js',import.meta.url),'utf8'),{window});
const essay='The author rejects homeschooling.',task='The author argues that homeschooling is well established.';
const data={schemaVersion:2,taskReview:{taskType:'source_essay',basis:'assumed',verdict:'partly_answered',expectedResponse:'Summarise and evaluate both sources.',explanation:'The second source is misinterpreted.',checks:[{requirement:'source_accuracy',status:'partial',explanation:'The source defends the practice.',evidence:[essay]}]},
 sourceReview:[{sourceQuote:task,point:'An established practice',coverage:'distorted',essayEvidence:[essay],explanation:'The essay reverses the source position.'}],
 learningPoints:[{example:essay,kind:'correction',sourceQuote:task,issue:'Source interpretation',explanation:'The body refutes the heading.',improvedExample:'The author defends homeschooling.',practiceInstruction:'Rewrite your summary.',checkQuestion:'Does the body support the heading?'}]};
for(const [language,title,note] of [['nl','Beantwoordt je essay de opdracht?','Deze versie bevat alleen taalcorrecties'],['es','¿Responde tu ensayo a la tarea?','Esta versión solo incorpora correcciones'],['en','Does your essay answer the task?','This draft contains language corrections']]) {
 window.ECWritingCoach.render(card,data,essay,task,language);
 assert.equal(card.hidden,false);assert(card.textContent.includes(title));assert(card.textContent.includes('Rewrite your summary.'));
 assert(card.textContent.includes('Does the body support the heading?'));assert(card.textContent.includes(task));
 assert.equal(card.children.find(n=>n.tagName==='details').open,true);assert.equal(draft.hidden,false);assert(draft.textContent.includes(note));
 console.log('PASS task verdict, assumption, sources, teaching example, exercise and draft warning in',language);
}
const answered=structuredClone(data);answered.taskReview.verdict='answered';answered.sourceReview[0].coverage='covered';
window.ECWritingCoach.render(card,answered,essay,task);assert.equal(draft.hidden,true);assert.equal(draft.textContent,'');
console.log('PASS successful task review clears the stale draft warning');
window.ECWritingCoach.render(card,data,'Unrelated writing.','Unrelated task.');
assert(!card.textContent.includes(essay));assert(!card.textContent.includes(task));assert(!card.textContent.includes('Rewrite your summary.'));
console.log('PASS invented or stale evidence and teaching examples are not rendered');
const unsafe=structuredClone(data);unsafe.learningPoints[0].improvedExample='<img src=x onerror=alert(1)>';
window.ECWritingCoach.render(card,unsafe,essay,task);assert(card.textContent.includes('<img'));
const walk=n=>[n,...n.children.flatMap(walk)];assert(!walk(card).some(n=>n.tagName==='img'));
console.log('PASS model and student strings are text, never executable HTML');
window.ECWritingCoach.render(card,{schemaVersion:2},essay,task);assert.equal(card.hidden,true);assert.equal(card.textContent,'');assert.equal(draft.hidden,true);
console.log('PASS v5.4.1 responses and clear state leave no empty or stale coaching section');
const missing=structuredClone(data);missing.taskReview.basis='missing';missing.taskReview.verdict='not_assessable';missing.sourceReview=[];missing.learningPoints=[];
window.ECWritingCoach.render(card,missing,essay,'','nl');assert(draft.textContent.includes('Voeg de volledige opdracht toe'));
console.log('PASS missing task requests the prompt rather than claiming task success');

for(const [language,warning] of [['en','has not been corrected'],['nl','niet hersteld'],['es','no se ha corregido']]) {
 const before=structuredClone(data);window.ECWritingCoach.render(card,data,essay,task,language);
 assert(draft.textContent.includes(warning));assert.deepEqual(data,before);
 const links=walk(draft).filter(n=>n.tagName==='a');assert.deepEqual(links.map(n=>n.href),['#writingCoachSources','#writingCoachExamples']);
 assert(walk(card).some(n=>n.id==='writingCoachSources'));assert(walk(card).some(n=>n.id==='writingCoachExamples'));
 assert(card.textContent.includes('The author defends homeschooling.'));
 console.log('PASS explicit remaining source error and direct explanation/example links in',language);
}
const translations=await readFile(new URL('../js/i18n.js',import.meta.url),'utf8'),html=await readFile(new URL('../index.html',import.meta.url),'utf8');
for(const label of ['Language-corrected version','Taalgecorrigeerde versie','Versión con correcciones lingüísticas'])assert(translations.includes(label));
assert(html.includes('nextDraftScope nextDraftContext nextDraftTaskContext'));assert(html.includes('Language-corrected version'));
assert(!translations.includes('"Gecorrigeerd essay"'));assert(!translations.includes('"Corrected essay"'));
console.log('PASS scope labels and permanently described draft limitation in EN NL ES');
