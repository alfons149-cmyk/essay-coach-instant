// ec_sentences.js
// Lightweight sentence-type analyzer with EN/ES heuristics.
// Exposes: window.EC_Sentences.analyze(text, opts) and analyzeToHTML(text, opts)

(function () {
  const DICT = {
    en: {
      summary: "Sentence-type summary",
      simple: "simple",
      compound: "compound",
      complex: "complex",
      compound_complex: "compound–complex",
      reasons: {
        simple: "No clear subordination or clause linking.",
        compound: "Has semicolon or a comma + coordinating conjunction joining clauses.",
        complex: "Has a subordinating conjunction or a relative clause.",
        compound_complex: "Has both coordination (compound) and subordination (complex)."
      },
      legend: "Legend",
      why: "Why",
    },
    es: {
      summary: "Resumen por tipo de oración",
      simple: "simple",
      compound: "compuesta (coordinada)",
      complex: "compuesta (subordinada)",
      compound_complex: "compuesta (coord. + subord.)",
      reasons: {
        simple: "Sin subordinación clara ni enlace de cláusulas.",
        compound: "Tiene punto y coma o coma + conjunción coordinante uniendo cláusulas.",
        complex: "Tiene conjunción subordinante o una relativa.",
        compound_complex: "Tiene coordinación (compuesta) y subordinación (subordinada)."
      },
      legend: "Leyenda",
      why: "Motivo",
    }
  };

  // Heuristic sets (EN + ES).
  const COORD_EN = ["and", "but", "or", "nor", "yet", "so", "for"];
  const SUB_EN = [
    "because","although","though","since","unless","while","whereas","if","when","before",
    "after","once","as","so that","even though","even if","until","rather than"
  ];
  const REL_EN = ["which","that","who","whom","whose","where","when"];

  const COORD_ES = ["y","e","o","u","pero","ni","mas","sino"];
  const SUB_ES = [
    "porque","aunque","ya que","puesto que","aun cuando","a pesar de que","si","cuando","antes de que",
    "después de que","mientras","donde","para que","de modo que","de manera que","con tal de que","a menos que","a no ser que","hasta que"
  ];
  const REL_ES = ["que","quien","quienes","cuyo","cuya","cuyos","cuyas","donde","cuando"];

  function pickDict(locale) {
    return (locale && DICT[locale]) ? DICT[locale] : DICT.en;
  }

  // --- Basic sentence segmentation (keeps last chunk without terminal punctuation) ---
  function splitSentences(text) {
    if (!text) return [];
    const cleaned = String(text).replace(/\s+/g, " ").trim();
    if (!cleaned) return [];
    // Grab chunks ending with . ! ? … (possibly with quotes) or the last trailing bit.
    const regex = /[^.?!…]+[.?!…]+(?=\s|$)|[^.?!…]+$/g;
    const matches = cleaned.match(regex) || [];
    return matches.map(s => s.trim()).filter(Boolean);
  }

  // Word-boundary find (safe-ish)
  function hasWord(seq, word) {
    const w = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${w}\\b`, "i").test(seq);
  }

  function anyWord(seq, arr) {
    return arr.some(w => hasWord(seq, w));
  }

  // Simple test for "comma + coordinator" pattern:
  function hasCommaCoord(seq, coords) {
    // Look for ", and", ", but", "; and" etc.
    const joined = coords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const re = new RegExp(`(,|;|:)\\s+(?:${joined})\\b`, "i");
    return re.test(seq);
  }

  function normalizeLocale(locale) {
    const l = (locale || "").toLowerCase();
    if (l.startsWith("es")) return "es";
    return "en";
  }

  // Classification core
  function classifySentence(sentence, locale) {
    const lang = normalizeLocale(locale);
    const s = sentence.trim();

    const coords = (lang === "es") ? COORD_ES : COORD_EN;
    const subs   = (lang === "es") ? SUB_ES   : SUB_EN;
    const rels   = (lang === "es") ? REL_ES   : REL_EN;

    const hasSemi = /;/.test(s);
    const commaCoord = hasCommaCoord(s, coords);
    const hasCoord = hasSemi || commaCoord;

    // Subordination: sub conj or obvious relative pronoun (careful with ES "que": too frequent)
    let hasSub = anyWord(s, subs) || anyWord(s, rels);
    // In Spanish, "que" is very common—reduce false positives:
    if (lang === "es" && /\bque\b/i.test(s)) {
      // consider it only if there's also a verb near it (very rough):
      if (!/\bque\b[^.?!,;:]{0,30}\b[a-záéíóúüñ]+(?:[aá]mos|[aeó]is|[an]|[as]|[a]|[o]|[e]|[en])\b/i.test(s)) {
        // leave other subordination indicators to carry the decision
        hasSub = anyWord(s, subs) || anyWord(s, rels.filter(r => r !== "que"));
      }
    }

    let type = "simple";
    const reasons = [];

    if (hasCoord) {
      type = "compound";
      reasons.push("coord");
    }
    if (hasSub) {
      if (type === "compound") {
        type = "compound_complex";
        reasons.push("sub");
      } else {
        type = "complex";
        reasons.push("sub");
      }
    }
    if (type === "simple") {
      reasons.push("none");
    }

    return { type, reasons, hasSemi, commaCoord, hasSub };
  }

  function typeLabel(key, d) {
    switch (key) {
      case "simple": return d.simple;
      case "compound": return d.compound;
      case "complex": return d.complex;
      case "compound_complex": return d.compound_complex;
      default: return key;
    }
  }

  function reasonText(type, d) {
    const r = d.reasons;
    return r[type] || "";
  }

  // Public: analyze(text, { locale })
  function analyze(text, opts = {}) {
    const { locale = "en" } = opts;
    const d = pickDict(locale);
    const sentences = splitSentences(String(text || ""));

    const items = sentences.map((t, i) => {
      const c = classifySentence(t, locale);
      return {
        index: i + 1,
        text: t,
        type: c.type,                // one of: simple | compound | complex | compound_complex
        label: typeLabel(c.type, d), // localized label
        reason: reasonText(c.type, d),
        features: {
          semicolon: !!c.hasSemi,
          commaCoord: !!c.commaCoord,
          subordination: !!c.hasSub
        }
      };
    });

    const counts = {
      simple: items.filter(x => x.type === "simple").length,
      compound: items.filter(x => x.type === "compound").length,
      complex: items.filter(x => x.type === "complex").length,
      compound_complex: items.filter(x => x.type === "compound_complex").length,
      total: items.length
    };

    return { items, counts };
  }

  // Public: analyzeToHTML(text, { locale })
  function analyzeToHTML(text, opts = {}) {
    const { locale = "en" } = opts;
    const d = pickDict(locale);
    const { items, counts } = analyze(text, { locale });

    if (!items.length) return "";

    // Small pills for counts
    const pill = (label, n) =>
      `<span class="pill" style="display:inline-block;border:1px solid #e5e7eb;border-radius:999px;padding:2px 8px;margin:2px 4px 2px 0;font-size:12px;background:#fff">${label}: <strong>${n}</strong></span>`;

    const legend = `
      <div class="muted-note" style="font-size:12px;opacity:.75;margin-top:6px">
        <strong>${escapeHtml(d.legend)}:</strong>
        ${escapeHtml(d.simple)} = no linking/subordination;
        ${escapeHtml(d.compound)} = semicolon OR comma+coordinator;
        ${escapeHtml(d.complex)} = subordinator/relative;
        ${escapeHtml(d.compound_complex)} = both.
      </div>`;

    const header =
      `<div style="margin-bottom:6px;font-weight:600">${escapeHtml(d.summary)}</div>
       <div aria-hidden="true" style="margin-bottom:6px">
         ${pill(d.simple, counts.simple)}
         ${pill(d.compound, counts.compound)}
         ${pill(d.complex, counts.complex)}
         ${pill(d.compound_complex, counts.compound_complex)}
         ${pill("Total", counts.total)}
       </div>${legend}`;

    // Per-sentence rows
    const rows = items.map(it => {
      const badgeClass = ({
        simple: "ok",
        compound: "warn",
        complex: "warn",
        compound_complex: "err"
      }[it.type]) || "ok";

      const badge =
        `<span class="badge ${badgeClass}" style="display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid #e5e7eb;font-size:12px;margin-right:6px">
          ${escapeHtml(it.label)}
        </span>`;

      const why =
        `<span class="muted-note" style="font-size:12px;opacity:.75;margin-left:6px">(${escapeHtml(d.why)}: ${escapeHtml(it.reason)})</span>`;

      // Use <div> with title for a simple accessible tooltip.
      return `<div style="margin:6px 0;padding:8px 10px;border:1px dashed #e5e7eb;border-radius:8px;background:#fff"
                  title="${escapeHtml(it.reason)}">
                ${badge}
                <span>${escapeHtml(it.text)}</span>
                ${why}
              </div>`;
    }).join("");

    return header + rows;
  }

  // Minimal escape
  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Expose
  window.EC_Sentences = {
    analyze,
    analyzeToHTML
  };
})();
