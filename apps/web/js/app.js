if (window.__EC_APP_LOADED) { throw new Error('app.js loaded twice'); }
window.__EC_APP_LOADED = true;


(function(){
const qs = new URLSearchParams(location.search);
const apiOverride = qs.get('api');
const dev = qs.get('dev')==='1';
if (apiOverride) {
const base = String(apiOverride).replace(/\/+$/,'');
window.EC_CONFIG.API_BASE = base;
}
document.getElementById('apiInfo').textContent = (dev? 'DEV (mock)' : EC_CONFIG.API_BASE);
if(dev){ const b=document.getElementById('devBanner'); if(b) b.style.display='inline-block'; }


const lang = window.__EC_LANG||'en';
loadI18n(lang).then(applyI18n).catch(console.error);


const lvlEl = document.getElementById('level');
const taskEl = document.getElementById('task');
const essayEl = document.getElementById('essay');
const inEl = document.getElementById('inWC');
const outEl = document.getElementById('outWC');
const targetEl = document.getElementById('p2TargetWC');
function updateCounts(){
const wc = wordCount(essayEl.value);
const inLabel = (window.__i18n?.[lang]?.['io.input_words']||'Input: {n} words').replace('{n}', wc);
inEl.textContent = inLabel;
targetEl.textContent = p2TargetForLevel(lvlEl.value).label;
}
essayEl.addEventListener('input', updateCounts); updateCounts();


document.getElementById('btnClear').addEventListener('click', ()=>{ essayEl.value=''; updateCounts(); });
document.getElementById('btnCorrect').addEventListener('click', async ()=>{
const payload = {
level: lvlEl.value,
taskType: 'essay',
taskPrompt: taskEl.value||'',
studentText: essayEl.value||'',
targetWordCount: p2TargetForLevel(lvlEl.value).max-10,
language: 'en',
options: { strictCambridge:true, minChangeEdits:true, highlightPunctuationJoins:true, returnInlineDiff:true },
client: { appVersion: EC_CONFIG.VERSION, dev }
};


let data;
if (dev) { data = mockCorrect(payload); }
else {
const res = await fetch(`${EC_CONFIG.API_BASE}/api/correct`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
if(!res.ok) { alert('API error'); return; }
data = await res.json();
}
renderResult(data);
});


function renderResult(d){
// scores
const s = d.scores||{};
document.getElementById('scores').innerHTML = `
Content: <b>${s.content?.band??'-'}</b> · CA: <b>${s.communicativeAchievement?.band??'-'}</b> · Org: <b>${s.organisation?.band??'-'}</b> · Lang: <b>${s.language?.band??'-'}</b>
<br><span class="muted">Overall: ${d.overall?.label||''}</span>`;
// edits
const list = document.getElementById('edits'); list.innerHTML='';
(d.edits||[]).slice(0,30).forEach(e=>{
const li=document.createElement('li');
li.innerHTML = `<code>${e.span?.text||''}</code> → <b>${e.suggestion||''}</b><br><span class="muted">${e.explanation||''}</span>`;
list.appendChild(li);
});
// next
const ul=document.getElementById('next'); ul.innerHTML='';
(d.nextDraft?.priorities||[]).forEach(p=>{ const li=document.createElement('li'); li.textContent=p; ul.appendChild(li); });


// output wc pill
})();