/* ===== EssayCoach Sentence Typing Add-on (standalone, no deps) =====
   Drop this file next to your index.html as `ec-sentences.js`.
   Then include it with: <script src="ec-sentences.js"></script>
   Public API: window.EC_Sentences.analyzeToHTML(text)
*/
(function(){
  // === Configurable connector lists ===
  const FANBOYS = ["for","and","nor","but","or","yet","so"];
  const CONJ_ADV = ["however","therefore","moreover","nevertheless","nonetheless","consequently","otherwise","meanwhile","hence","thus","accordingly","furthermore","instead","indeed","still"];
  const SUBORD = [
    "after","although","as","as if","as long as","as soon as","as though",
    "because","before","even if","even though","if","in case","in order that",
    "once","provided that","rather than","since","so that","than","that","though",
    "unless","until","when","whenever","where","whereas","wherever","whether","while"
  ];

  // === CSS injector (scoped, safe to call multiple times) ===
  function injectCSS(){
    if (document.getElementById("ec-sent-css")) return;
    const css = `
      .ec-sent-legend{display:flex;gap:.5rem;flex-wrap:wrap;margin:.75rem 0}
      .ec-badge{font:12px/1.2 system-ui,sans-serif;border-radius:999px;padding:.2rem .5rem;border:1px solid #ddd}
      .ec-badge.simple{background:#f7f7f7}
      .ec-badge.compound{background:#eef7ff}
      .ec-badge.complex{background:#f4f8ee}
      .ec-badge.compound-complex{background:#fff5e6}
      .ec-sent{position:relative;border-radius:.35rem;padding:.12rem .2rem;margin:-.12rem -.2rem}
      .ec-sent.simple{box-shadow:inset 0 -2px 0 #eee}
      .ec-sent.compound{box-shadow:inset 0 -2px 0 #b9ddff}
      .ec-sent.complex{box-shadow:inset 0 -2px 0 #cfe7b9}
      .ec-sent.compound-complex{box-shadow:inset 0 -2px 0 #ffd699}
      .ec-sent[data-issue]{outline:1px dashed #cc6b6b;background:linear-gradient(0deg, rgba(255,234,234,.7), rgba(255,234,234,.7))}
      .ec-tip{position:absolute;z-index:10;left:0;bottom:100%;transform:translateY(-.25rem);max-width:28rem;background:#111;color:#fff;padding:.5rem .6rem;border-radius:.4rem;font:12px/1.35 system-ui,sans-serif;display:none;white-space:normal}
      .ec-sent:hover .ec-tip{display:block}
      .ec-conn{opacity:.85;font-style:italic}
      .ec-issues{color:#ffd9d9}
    `;
    const style = document.createElement('style');
    style.id = 'ec-sent-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // === Sentence utils ===
  function splitIntoSentences(text){
    const safe = String(text||"").replace(/\s+/g,' ').trim();
    const parts = safe.match(/[^.!?]+[.!?]+|"[^"]+"|[^.!?]+$/g) || (safe ? [safe] : []);
    return parts.map(s=>s.trim()).filter(Boolean);
  }

  function roughFiniteVerbCount(s){
    const modals = /\b(can|could|may|might|must|shall|should|will|would)\b/gi;
    const aux = /\b(is|are|am|was|were|do|does|did|has|have|had)\b/gi;
    const ed = /\b\w{3,}ed\b/g;
    const es = /\b\w{3,}s\b/g; // crude heuristic to bump counts in longer clauses
    return ((s.match(modals)||[]).length + (s.match(aux)||[]).length + (s.match(ed)||[]).length + (s.match(es)||[]).length);
  }

  function escapeRegExp(str){return str.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
  function escapeHTML(s){return String(s).replace(/[&<>"]|[']/g, m=>({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[m]));}
  function titleCase(s){return s.replace(/\b\w/g,c=>c.toUpperCase());}

  function findAll(words,s){
    const lower=s.toLowerCase();
    const out=[]; words.forEach(w=>{ const re=new RegExp(`\\b${escapeRegExp(w)}\\b`,'g'); if(re.test(lower)) out.push(w); });
    return Array.from(new Set(out));
  }
  function containsAny(words,s){
    const lower=s.toLowerCase();
    return words.some(w=> new RegExp(`\\b${escapeRegExp(w)}\\b`).test(lower));
  }

  // === Issue checks ===
  function findIssues(s){
    const issues=[];
    // Comma splice heuristic: comma separating two likely ICs without FANBOYS immediately after the comma
    if (/,/.test(s)){
      const parts=s.split(',');
      for (let i=0;i<parts.length-1;i++){
        const left=parts[i].trim();
        const right=parts[i+1].trim();
        const rightFirst=(right.match(/^([A-Za-z']+)/)||[])[1]?.toLowerCase()||'';
        const likelyICs = roughFiniteVerbCount(left)>0 && roughFiniteVerbCount(right)>0;
        const hasCoordinator = FANBOYS.includes(rightFirst);
        if (likelyICs && !hasCoordinator){ issues.push("Possible comma splice: two independent clauses joined by a comma."); break; }
      }
    }
    // Semicolon + coordinator oddity
    if (/;/.test(s) && containsAny(FANBOYS,s)){
      issues.push("Semicolon + coordinator is unusual; prefer comma + coordinator or semicolon alone.");
    }
    // Conjunctive adverb punctuation
    const advs = findAll(CONJ_ADV, s);
    if (advs.length){
      advs.forEach(adv=>{
        const preOK = new RegExp(`(?:;|\.)\\s*${escapeRegExp(adv)}\\b`, 'i').test(s);
        const commaOK = new RegExp(`\\b${escapeRegExp(adv)}\\b\\s*,`).test(s);
        if (!preOK || !commaOK){
          issues.push(`Conjunctive adverb (“${adv}”): usually write “; ${adv}, …” or “. ${adv}, …”.`);
        }
      });
    }
    return Array.from(new Set(issues));
  }

  // === Classifier ===
  function classifySentence(s){
    const hasFanboys = findAll(FANBOYS, s);
    const hasSemicolon = /;/.test(s);
    const hasConjAdv = findAll(CONJ_ADV, s);
    const hasSubord = findAll(SUBORD, s);

    let ic = roughFiniteVerbCount(s) > 0 ? 1 : 0; // base
    if (hasSemicolon) ic++;
    if (hasFanboys.length && s.split(/\s+/).length>6) ic++;

    const hasDC = hasSubord.length>0 || /\b(which|who|whom|whose|that)\b/i.test(s);

    let type = 'simple';
    if (ic >= 2 && hasDC) type = 'compound-complex';
    else if (ic >= 2) type = 'compound';
    else if (hasDC) type = 'complex';

    const reasons=[];
    if (type==='simple') reasons.push('Single-clause structure with no strong subordination/coordination signals.');
    else {
      if (ic>=2) reasons.push(`Detected ${ic} independent-clause signals (semicolon/FANBOYS/verb patterns).`);
      if (hasDC) reasons.push('Detected dependent-clause signal(s) (subordinator/relative).');
    }

    const issues = findIssues(s);
    return {
      type,
      reasons,
      connectors: {
        fanboys: hasFanboys,
        semicolon: hasSemicolon ? [';'] : [],
        conjunctive_adverbs: hasConjAdv,
        subordinators: hasSubord
      },
      issues
    };
  }

  // === Render ===
  function renderLegend(){
    return `
      <div class="ec-sent-legend" aria-label="Sentence types legend">
        <span class="ec-badge simple" title="One independent clause">Simple</span>
        <span class="ec-badge compound" title="IC + IC (FANBOYS/; / conj. adv.)">Compound</span>
        <span class="ec-badge complex" title="IC + DC (subordinator/relative)">Complex</span>
        <span class="ec-badge compound-complex" title="IC + IC + DC">Compound-Complex</span>
      </div>`;
  }

  function analyzeToHTML(text){
    injectCSS();
    const sents = splitIntoSentences(text);
    const html = sents.map(sent => {
      const info = classifySentence(sent);
      const issueAttr = info.issues.length ? ' data-issue="1"' : '';
      const cls = 'ec-sent ' + info.type.replace(' ','-');
      const tip = `
        <div class="ec-tip" role="tooltip">
          <div><strong>${titleCase(info.type)}</strong></div>
          ${info.reasons.length ? `<div>${info.reasons.map(r=>`• ${escapeHTML(r)}`).join('<br>')}</div>` : ''}
          <div class="ec-conn">Connectors: 
            FANBOYS [${info.connectors.fanboys.join(', ')||'—'}] |
            ; [${info.connectors.semicolon.join('')||'—'}] |
            Conj. Adv. [${info.connectors.conjunctive_adverbs.join(', ')||'—'}] |
            Subordinators [${info.connectors.subordinators.join(', ')||'—'}]
          </div>
          ${info.issues.length ? `<div class="ec-issues">${info.issues.map(i=>`⚠ ${escapeHTML(i)}`).join('<br>')}</div>`:''}
        </div>`;
      return `<span class="${cls}"${issueAttr}>${escapeHTML(sent)}${tip}</span> `;
    }).join('');
    return renderLegend() + `<div>${html}</div>`;
  }

  // Public API
  window.EC_Sentences = { analyzeToHTML, classifySentence, splitIntoSentences };
})();
