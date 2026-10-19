import {readFile} from 'node:fs/promises';
import {numberSentences,sourceCatalog,punctuationCandidates} from '../../apps/worker/src/worker.js';
// Synthetic valid C2 replies for local load tests. Never a real model evaluation.
const input=JSON.parse(await readFile(new URL('../fixtures/homeschooling-c2.json',import.meta.url),'utf8'));
const {sourceBodies,...payload}=input,ss=numberSentences(payload.essay);
const id=part=>ss.find(s=>s.text.includes(part)).id;
const mistaken=id('not widely recognized'),closing=id('both advantages'),punctuation=id('however effective'),although=id('Although,');
const plan={taskType:'source_essay',instructionStatus:'assumed',summary:'Assume a C2 essay summarising and evaluating the two sources, with a supported personal position.',sources:[
 {label:'Text 1',sourceQuote:sourceBodies[0],position:'Homeschooling adds teaching duties and can reduce family income.',keyPoints:[{quote:'your family may suffer a loss in income',meaning:'Parents may face a financial cost.'}]},
 {label:'Text 2',sourceQuote:sourceBodies[1],position:'The body refutes the negative heading: homeschooling is established and supported.',keyPoints:[{quote:'homeschooling is well-established, with curriculum options and support groups',meaning:'Homeschooling has an established infrastructure.'}]}
]};
function assessment(){return {
 sampleSuitable:true,feedback:'You identify practical pressures, but reverse the second author’s position. Explain that the author defends homeschooling as established, then weigh that support against the financial cost. Your conclusion states a view but needs supporting reasoning.',
 assessment:{taskSufficient:true,criteria:{
  content:{score:2,reason:'The second source is misinterpreted and its available support is not represented accurately.',evidenceIds:[mistaken]},
  communicative:{score:2,reason:'The text mainly summarises; the closing opinion is not developed through evaluation.',evidenceIds:[closing]},
  organisation:{score:3,reason:'Clear paragraphs, but although does not express a clear concession here.',evidenceIds:[although]},
  language:{score:3,reason:'Repair the clause construction and however punctuation.',evidenceIds:[punctuation,although]}}},
 keyFocus:{action:'Correct your interpretation of the second source.',evidenceId:mistaken,explanation:'The body challenges the heading; it does not endorse it.'},
 sourceReview:[{sourceQuote:plan.sources[0].keyPoints[0].quote,point:'Financial cost',coverage:'covered',evidenceRelation:'agrees',essayEvidenceIds:[id('reduction in your')],explanation:'The essay mentions possible reduced income.'},
  {sourceQuote:plan.sources[1].keyPoints[0].quote,point:'An established alternative',coverage:'distorted',evidenceRelation:'contradicts',essayEvidenceIds:[mistaken],explanation:'The essay attributes the rejected view to the author.'}],
 taskReview:{taskType:'source_essay',basis:'assumed',verdict:'partly_answered',expectedResponse:plan.summary,explanation:'The instructions are absent, so this is a provisional C2 source-essay review.',checks:[
  {requirement:'task_coverage',status:'partial',explanation:'The practical costs are included; available support needs attention.',evidenceIds:[id('reduction in your')]},
  {requirement:'source_accuracy',status:'partial',explanation:'The second author’s position is reversed.',evidenceIds:[mistaken]},
  {requirement:'evaluation',status:'missing',explanation:'A generic closing opinion does not weigh the source arguments.',evidenceIds:[closing]},
  {requirement:'own_position',status:'partial',explanation:'A view is expressed but its reasoning needs development.',evidenceIds:[closing]}]},
 learningPoints:[{category:'source_interpretation',kind:'correction',evidenceId:mistaken,sourceQuote:plan.sources[1].keyPoints[0].quote,issue:'A heading is mistaken for the author’s position.',explanation:'Read the body: it provides evidence against the heading’s claim.',improvedExample:'The second text challenges the idea that homeschooling is not an established form of education.',practiceInstruction:'Rewrite your summary of the second author’s position using evidence from the body.',checkQuestion:'Does the body support or refute the heading?'},
  {category:'task_response',kind:'development',evidenceId:closing,sourceQuote:plan.sources[0].keyPoints[0].quote,issue:'Your judgement needs a reason.',explanation:'Connect the available support with the costs parents may face.',improvedExample:'Support groups may reduce the organisational burden, but they do not necessarily replace lost income.',practiceInstruction:'Write two sentences weighing one benefit against one limitation.',checkQuestion:'Have you explained why one consideration matters rather than merely listing both?'}],
 edits:[{kind:'correction',sentenceId:punctuation,replacement:ss.find(s=>s.id===punctuation).text.replace('however effective','however, effective'),reason:'Add the comma after the linking adverb however.'},
  {kind:'correction',sentenceId:although,replacement:'Homeschooling has existed for over a century; what is more, homeschooling existed before our current public education system.',reason:'These facts reinforce the same point; no concession is expressed.'}],sentenceInsights:[],vocabularySuggestions:[]
};}
function wire(d) {
 const copy=structuredClone(d);
 if(copy.taskReview?.taskType!=='source_essay') return copy;
 const catalog=sourceCatalog(plan);
 copy.sourceReviewById=Object.fromEntries(catalog.map(p=>{
  const review=copy.sourceReview.find(s=>s.sourceQuote===p.quote);
  const {sourceQuote,essayEvidenceIds,...entry}=review;return [p.id,{...entry,evidenceItems:essayEvidenceIds.map(sentenceId=>({sentenceId,relation:entry.evidenceRelation==='contradicts'?'contradicts':'agrees'}))}];
 }));
 delete copy.sourceReview;
 for(const point of copy.learningPoints) {
  point.sourcePointId=catalog.find(p=>p.quote===point.sourceQuote)?.id||'';delete point.sourceQuote;
 }
 return copy;
}
function auditedWire() {
 const d=wire(assessment());
 d.languageAudit={checkedSentenceIds:ss.map(s=>s.id),corrections:d.edits.map(e=>({sentenceId:e.sentenceId,category:'punctuation',originalQuote:ss.find(s=>s.id===e.sentenceId).text,replacementQuote:e.replacement,explanation:e.reason})),punctuationChecks:Object.fromEntries(punctuationCandidates(ss).map(c=>[c.id,{decision:d.edits.some(e=>e.sentenceId===c.sentenceId)?'correction':'valid',explanation:'The linking marker requires a delimiter in this context.'}]))};
 return d;
}
export {payload,plan,auditedWire};
