// Characterisation of v5.6.21 routing gaps, not a replay of the unavailable live JSON.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {numberSentences,constructAuditedEdits,auditRepairContext,resolveSentenceRepairs,reviewSchema,evidenceChanges} from '../apps/worker/src/worker.js';
const input=JSON.parse(await readFile(new URL('./fixtures/remote-work-user-20261019.json',import.meta.url),'utf8'));
const sentences=numberSentences(input.essay),original=sentences.find(s=>s.id==='S9').text;
const correction=replacement=>({sentenceId:'S9',category:'grammar',originalQuote:original,replacementQuote:replacement,explanation:'Synthetic proposal: inspect tense and agreement against the original.'});
function plan(replacement){const data={languageAudit:{corrections:[correction(replacement)]}};const issues=constructAuditedEdits(data,sentences);return {data,issues,repair:auditRepairContext(data,sentences,issues)};}
const complete=original.replace('is working','has been working').replace('since two years','for two years').replace('never want','never wants').replace('he hate','he hates').replace('he like','he likes');
const good=plan(complete);
assert.equal(good.repair.recoveryCandidates.length,1);
const candidate=good.repair.recoveryCandidates[0];
const constrained={languageAudit:{sentenceRepairs:[{sentenceId:'S9',explanations:Object.fromEntries(candidate.fragments.map(f=>[f.id,'Synthetic explanation for the local change.']))}]}};
assert.deepEqual(resolveSentenceRepairs(constrained,good.repair),[]);
assert.deepEqual(constructAuditedEdits(constrained,sentences),[]);
assert.equal(constrained.edits[0].replacement,complete);
console.log('PASS complete S9 candidate reconstructs without a conflict (mechanical check only)');
// has told is intentionally a synthetic, unapproved choice: this tests the diff
// coordinate algorithm, not whether that tense change is necessary in this essay.
const shifted=plan(original.replace('is working','has been working').replace('told me','has told me'));
assert.equal(shifted.issues.length,1);assert(shifted.issues[0].includes('split broad evidence'));
assert.equal(shifted.repair.recoveryCandidates.length,0);
const hint=shifted.repair.sentences[0].spans[0].localChangeHints.find(h=>h.originalQuote==='years, told');
assert.equal(hint.originalOffset,52);
const local=evidenceChanges(hint.originalQuote,hint.replacementQuote,original.indexOf(hint.originalQuote));
assert.equal(local[0].start,53);
assert(reviewSchema(sentences,null,'en',shifted.repair).properties.languageAudit.properties.corrections);
assert.equal(reviewSchema(sentences,null,'en',shifted.repair).properties.languageAudit.properties.sentenceRepairs,undefined);
console.log('PASS characterised whitespace alignment mismatch: granular-only failure can fall back to free-form schema');
const conflicting={languageAudit:{corrections:[
 {sentenceId:'S9',category:'grammar',originalQuote:'is working',replacementQuote:'has been working',explanation:'Synthetic tense change.'},
 {sentenceId:'S9',category:'grammar',originalQuote:'is working from home',replacementQuote:'worked from home',explanation:'Different synthetic tense change.'}
]}};
assert.deepEqual(resolveSentenceRepairs(conflicting,good.repair),[]);
assert(constructAuditedEdits(conflicting,sentences).some(issue=>issue.includes('S9 has conflicting')));
assert.deepEqual(conflicting.edits,[]);
console.log('PASS characterised legacy response bypass at resolver; strict construction still rejects conflict');
console.log('3 routing characterisations passed; synthetic audit proposals, no AI request, no Worker change.');
