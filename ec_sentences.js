// ec_sentences.js
// Sentence-Type Analyzer module with color coding, tooltips, keyboard support, and legend help.

window.EC_Sentences = (function(){
  // Basic heuristic classifier
  function classify(sentence){
    const s = sentence.trim();
    if(!s) return { type:"empty", label:"(empty)", issues:["Empty sentence"] };

    // heuristics
    const hasSub = /\b(although|because|since|when|while|if|unless|whereas|though)\b/i.test(s);
    const clauses = s.split(/[,;:]/).length;
    const hasFanboys = /\b(for|and|nor|but|or|yet|so)\b/i.test(s);
    const wordCount = s.split(/\s+/).length;

    if(wordCount < 3) return { type:"frag", label:"Fragment", issues:["Too short"] };

    if(hasSub && hasFanboys) return { type:"compound-complex", label:"Compound–Complex", issues:[] };
    if(hasSub) return { type:"complex", label:"Complex", issues:[] };
    if(hasFanboys || clauses > 1) return { type:"compound", label:"Compound", issues:[] };
    return { type:"simple", label:"Simple", issues:[] };
  }

  function colorFor(type){
    switch(type){
      case "simple": case "compound": case "complex": case "compound-complex":
        return "green"; // correct types
      case "frag":
        return "orange";
      case "empty":
        return "gray";
      default:
        return "red";
    }
  }

  function analyzeToHTML(text, opts){
    if(!text) return "";
    const sentences = text.split(/([.!?])\s+/).reduce((acc,chunk,i,arr)=>{
      if(i%2===0){ // sentence part
        const end = arr[i+1]||"";
        const full = chunk+end;
        if(full.trim()) acc.push(full.trim());
      }
      return acc;
    },[]);
    let html = "";
    sentences.forEach((s,i)=>{
      const res = classify(s);
      const clr = colorFor(res.type);
      html += `<div class="sent" style="margin:4px 0;padding:4px;border-left:4px solid ${clr}" tabindex="0" data-issues="${res.issues.join(", ")}"><strong>[${res.label}]</strong> ${s}</div>`;
    });
    if(sentences.length===0) return "";

    // Legend + keyboard accessible tooltips
    html += `<div class="legend" style="margin-top:8px;font-size:12px;color:#6b7280">
      <span style="color:green">Green</span> = correct sentence types &nbsp; 
      <span style="color:orange">Orange</span> = possible fragments &nbsp; 
      <span style="color:red">Red</span> = errors
      <span class="legend-help" tabindex="0" aria-label="More help">?</span>
    </div>`;
    return html;
  }

  // Tooltip logic
  document.addEventListener("mouseover", e=>{
    const t = e.target.closest(".sent");
    if(t && t.dataset.issues){
      if(t.dataset.issues && t.dataset.issues!==""){
        const tip=document.createElement("div");
        tip.className="ec-tip";
        tip.textContent="Issues: "+t.dataset.issues;
        document.body.appendChild(tip);
        const move=(ev)=>{tip.style.left=(ev.pageX+12)+"px"; tip.style.top=(ev.pageY+12)+"px";};
        document.addEventListener("mousemove",move);
        t.addEventListener("mouseout",()=>{tip.remove(); document.removeEventListener("mousemove",move);},{once:true});
      }
    }
  });

  // Legend help
  document.addEventListener("click", e=>{
    if(e.target.classList.contains("legend-help")){
      alert("Legend:\nGreen = correct sentence types (simple, compound, complex, compound–complex)\nOrange = possible fragments\nRed = errors (run-ons, comma splices)");
    }
  });

  return { analyzeToHTML };
})();
