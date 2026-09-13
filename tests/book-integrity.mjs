import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { units } from '../assets/book/course-data.js';
import { UNIT_ANCHORS, MISTAKE_MAP } from '../feedback/mistake-map.js';

const files = new Map();
assert.equal(units.length, 20);
for (const unit of units) {
  const markup = readFileSync(new URL(`../assets/book/units/unit${String(unit.number).padStart(2, '0')}.html`, import.meta.url), 'utf8');
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, `Duplicate IDs: Unit ${unit.number}`);
  assert.ok(markup.includes(`<h1>${unit.title}</h1>`), `Title mismatch: Unit ${unit.number}`);
  assert.ok(markup.includes('Alfons Sergeant'));
  assert.ok(markup.includes('Apply it independently'));
  assert.ok(markup.includes('Compare with a possible answer'));
  for (const match of markup.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(ids.includes(match[1]), `Missing internal target ${match[1]}`);
  }
  const models = [...markup.matchAll(/<div class="model-answer" data-model-level="(B2|C1|C2)" data-word-count="(\d+)">([\s\S]*?)<\/div>/g)];
  for (const [, level, statedCount, body] of models) {
    const words = body.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
    const [low, high] = { B2: [140,190], C1: [220,260], C2: [240,280] }[level];
    assert.equal(words, Number(statedCount));
    assert.ok(words >= low && words <= high, `${level} model length: ${words}`);
  }
  files.set(unit.number, { markup, ids });
}
for (const [key, ref] of Object.entries(UNIT_ANCHORS)) {
  assert.ok(files.get(ref.unit)?.ids.includes(ref.id), `Feedback anchor ${key} -> ${ref.unit}/${ref.id} missing`);
}
assert.equal(MISTAKE_MAP.weakIntroduction.sectionId, 'u7-intro');
assert.equal(MISTAKE_MAP.onlyOneOpinion.unit, 13);
assert.match(MISTAKE_MAP.onlyOneOpinion.description, /selected points/);
console.log('20 units: titles, unique IDs, internal links, feedback destinations, self-study cards and B2/C1/C2 model lengths verified.');
