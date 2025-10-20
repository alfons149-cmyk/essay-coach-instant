function wordCount(s){ return (s||'').trim().split(/\s+/).filter(Boolean).length; }
function p2TargetForLevel(lvl){
const map={B2:{min:140,max:190,label:'B2: 140–190'}, C1:{min:220,max:260,label:'C1: 220–260'}, C2:{min:240,max:280,label:'C2: 240–280'}};
return map[lvl]||map.C1;
}