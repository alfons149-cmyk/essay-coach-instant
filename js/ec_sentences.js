// ec_sentences.js
// Lightweight sentence-type analyzer with EN/ES heuristics.
// Exposes: window.EC_Sentences.analyze(text, opts) and analyzeToHTML(text, opts)

(window.__LOAD_ORDER ||= []).push('ec_sentences');

(function () {
  const DICT = {
    en: {
      summary: "Sentence-type summary",
      simple: "simple",
      compound: "compound",
      complex: "complex",
      compound_complex: "compound–complex",
      legend: "Legend",
      why: "Why",
      total: "Total",              // ← add this
      reasons: {
        simple: "No clear subordination or clause linking.",
        compound: "Has semicolon or a comma + coordinating conjunction joining clauses.",
        complex: "Has a subordinating conjunction or a relative clause.",
        compound_complex: "Has both coordination (compound) and subordination (complex)."
      }
    },
    es: {
      summary: "Resumen por tipo de oración",
      simple: "simple",
      compound: "compuesta (coordinada)",
      complex: "compuesta (subordinada)",
      compound_complex: "compuesta (coord. + subord.)",
      legend: "Leyenda",
      why: "Motivo",
      total: "Total",              // ← add this (or "Total general" if you prefer)
      reasons: {
        simple: "Sin subordinación clara ni enlace de cláusulas.",
        compound: "Tiene punto y coma o coma + conjunción coordinante uniendo cláusulas.",
        complex: "Tiene conjunción subordinante o una relativa.",
        compound_complex: "Tiene coordinación (compuesta) y subordinación (subordinada)."
      }
    }
  };

  // ...

  function analyzeToHTML(text, opts = {}) {
    const { locale = "en" } = opts;
    const d = pickDict(locale);
    const { items, counts } = analyze(text, { locale });

    if (!items.length) return "";

    const pill = (label, n) =>
      `<span class="pill" style="display:inline-block;border:1px solid #e5e7eb;border-radius:999px;padding:2px 8px;margin:2px 4px 2px 0;font-size:12px;background:#fff">${label}: <strong>${n}</strong></span>`;

    const header =
      `<div style="margin-bottom:6px;font-weight:600">${escapeHtml(d.summary)}</div>
       <div aria-hidden="true" style="margin-bottom:6px">
         ${pill(d.simple, counts.simple)}
         ${pill(d.compound, counts.compound)}
         ${pill(d.complex, counts.complex)}
         ${pill(d.compound_complex, counts.compound_complex)}
         ${pill(d.total, counts.total)}            <!-- ← use d.total here -->
       </div>` + /* legend follows */ "";

