// js/app.js — EssayCoach UI (stable single-file version: i18n + buttons + counters + summary + bands)

(() => {
  // -----------------------------
  // Global config / API
  // -----------------------------
  window.EC = window.EC || {};
  const qs  = new URLSearchParams(location.search);
  const DEV = (typeof EC.DEV === "boolean") ? EC.DEV : (qs.get("dev") === "1");
  const API_BASE = (EC.API_BASE || "").replace(/\/+$/, "");

  console.log("[EC] API_BASE =", API_BASE || "(mock)", "DEV?", DEV);

  // -----------------------------
  // DOM helpers
  // -----------------------------
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // -----------------------------
  // Element refs
  // -----------------------------
  const el = {
    task:       $("#task"),
    essay:      $("#essay"),
    nextDraft:  $("#nextDraft"),
    feedback:   $("#feedback"),
    edits:      $("#edits"),
    inWC:       $("#inWC"),
    outWC:      $("#outWC"),
    btnCorrect: $("#btnCorrect"),
    btnClear:   $("#btnClear"),
    statusLine: $("#statusLine")
  };

  // -----------------------------
  // Status helper
  // -----------------------------
  function setStatus(keyOrText) {
    if (!el.statusLine) return;

    if (!keyOrText) {
      el.statusLine.textContent = "";
      return;
    }

    if (window.I18N && typeof window.I18N.t === "function") {
      el.statusLine.textContent = window.I18N.t(keyOrText) || "";
    } else {
      el.statusLine.textContent = keyOrText;
    }
  }
  window.EC.setStatus = setStatus;

  // -----------------------------
  // i18n helpers
  // -----------------------------
  function applyI18nToDom() {
    if (!window.I18N || typeof I18N.t !== "function") return;

    // Optional: page title
    const title = I18N.t("meta.title");
    if (typeof title === "string" && title) document.title = title;

    // Plain text nodes
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      const val = I18N.t(key);
      if (typeof val === "string" && val) node.textContent = val;
    });

    // Placeholders
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      const key = node.getAttribute("data-i18n-placeholder");
      const val = I18N.t(key);
      if (typeof val === "string" && val) node.setAttribute("placeholder", val);
    });

    // Title attributes (tooltips)
    document.querySelectorAll("[data-i18n-title]").forEach((node) => {
      const key = node.getAttribute("data-i18n-title");
      const val = I18N.t(key);
      if (typeof val === "string" && val) node.setAttribute("title", val);
    });

    // Refresh counters for new language
    clearCounterTemplates();
    updateCounters();
    assessmentLabels();
    if (latestAssessment) {
      const {response,level,essay} = latestAssessment;
      renderAssessment(response,level,essay);
      setFeedbackAndCourseHelp(response,essay);
      renderExtras(response);
    }
  }

  function detectUILang() {
    // Prefer i18n engine if available
    if (window.I18N) {
      if (typeof I18N.getLanguage === "function") {
        const v = I18N.getLanguage();
        if (v) return String(v).slice(0, 2).toLowerCase();
      }
      if (typeof I18N.lang === "string") return I18N.lang.slice(0, 2).toLowerCase();
      if (typeof I18N.language === "string") return I18N.language.slice(0, 2).toLowerCase();
    }

    return (localStorage.getItem("ec.lang") || "en").slice(0, 2).toLowerCase();
  }

  // -----------------------------
  // Course Book helper bridge
  // -----------------------------
  // Recommendations come only from structured, quoted evidence, never keyword matches.
  function setFeedbackAndCourseHelp(response, essay) {
    if (el.feedback) el.feedback.textContent = response.feedback || "—";
    const container = $("#feedback-card");
    if (!container) return;
    container.innerHTML = "";
    const insights = response.schemaVersion === 2 && Array.isArray(response.sentenceInsights)
      ? response.sentenceInsights.filter(si => typeof si.example === "string" && si.example.length >= 8 &&
          essay.includes(si.example) && si.explanation && Number.isInteger(si.unit) && si.unit >= 1 && si.unit <= 20)
      : [];
    const intro = document.createElement("p");
    intro.textContent = insights.length ? copy("courseIntro") : copy("noCourse");
    container.appendChild(intro);
    for (const si of insights) {
      const item = document.createElement("section");
      item.className = "ec-feedback-item";
      const title = document.createElement("h3");
      title.textContent = `${copy(si.kind === "correction" ? "correction" : "suggestion")}: ${si.issue}`;
      const quote = document.createElement("blockquote");
      quote.textContent = si.example;
      const explanation = document.createElement("p");
      explanation.textContent = si.explanation;
      const link = document.createElement("a");
      link.textContent = `${copy("study")} ${si.unit}`;
      link.href = `assets/book/reader.html?unit=${si.unit}`;
      link.target = "_blank"; link.rel = "noopener noreferrer";
      item.append(title, quote, explanation);
      if(si.betterVersion) {const p=document.createElement('p');p.textContent=si.betterVersion;item.appendChild(p);}
      item.appendChild(link);
      container.appendChild(item);
    }
  }

  // -----------------------------
  // Corrector (live API or mock)
  // -----------------------------
  async function correctEssay(payload) {
    if (!DEV && API_BASE) {
      const url = `${API_BASE}/correct`;


      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "omit"
      });

      const text = await res.text();


      if (!res.ok) throw new Error(`API ${res.status}: ${text}`);
      return JSON.parse(text);
    }

    // DEV mock
    await sleep(300);
    const txt = payload.essay || "";
    const wc  = wcCount(txt);

    const edits = /\ba lot\b/i.test(txt)
      ? [{
          from: "a lot",
          to: payload.level === "B2" ? "much" : "numerous",
          reason: "Register"
        }]
      : [];

    return {
      level: payload.level,
      inputWords: wc,
      outputWords: wc,
      feedback: `✅ Mock feedback for ${payload.level}.`,
      edits,
      nextDraft: txt.replace(/\ba lot\b/gi, edits[0]?.to || "a lot"),
      vocabularySuggestions: {
        "a lot": ["many", "numerous", "substantially"]
      },
      sentenceInsights: [{
        example: "a lot",
        issue: "informal quantifier",
        explanation:
          "In exam writing, “a lot” is usually too informal. Try a more neutral, precise alternative.",
        betterVersions: ["many", "numerous"],
        linkHint: "See Unit 6 — Vocabulary precision & register."
      }]
    };
  }

  // -----------------------------
  // Counters
  // -----------------------------
  function setCounter(node, i18nKey, n) {
    if (!node) return;
    const ATTR = "data-i18n-template";
    let tpl = node.getAttribute(ATTR);

    if (!tpl) {
      tpl = (window.I18N && I18N.t) ? I18N.t(i18nKey, { n: "{n}" }) : "";
      if (!tpl || !/\{n\}/.test(tpl)) {
        tpl =
          node.textContent && /\{n\}/.test(node.textContent)
            ? node.textContent
            : i18nKey === "io.input_words"
              ? "Input: {n} words"
              : "Output: {n} words";
      }
      node.setAttribute(ATTR, tpl);
    }

    node.textContent = tpl.replace(/\{n\}/g, n ?? 0);
  }

  function clearCounterTemplates() {
    if (el.inWC)  el.inWC.removeAttribute("data-i18n-template");
    if (el.outWC) el.outWC.removeAttribute("data-i18n-template");
  }

  function updateCounters() {
    if (!el.essay) return;

    const wc = wcCount(el.essay.value);

    // inWC can be either:
    // - a "number only" span in your new layout, or
    // - a templated "Input: {n} words" span in the old layout.
    if (el.inWC) {
      const hasTemplate = el.inWC.getAttribute("data-i18n-template") || /\{n\}/.test(el.inWC.textContent || "");
      if (hasTemplate) setCounter(el.inWC, "io.input_words", wc);
      else el.inWC.textContent = String(wc);
    }

    if (el.outWC) {
      const hasTemplate = el.outWC.getAttribute("data-i18n-template") || /\{n\}/.test(el.outWC.textContent || "");
      if (hasTemplate) setCounter(el.outWC, "io.output_words", wcCount(el.nextDraft?.value || ""));
      else el.outWC.textContent = String(wcCount(el.nextDraft?.value || ""));
    }
  }

  // -----------------------------
  // Summary Key Focus (teacher-style action)
  // -----------------------------
  // Practice criteria are not Cambridge English Scale scores.
  let latestAssessment = null;
  let requestSequence = 0;
  const COPY = {
    en: {
      noEdits: "No specific corrections or optional rewrites were returned for this text.",
      quick: "Practice summary",
      hint: "Feedback on this draft and a practical next step. A full assessment needs the task prompt.",
      feedbackHint: "AI writing feedback, with supporting examples from your essay.",
      target: "Target level",
      partial: "Task prompt missing or incomplete — only Organisation and Language assessed.",

      title: "AI practice assessment", score: "Estimated task marks", summary: "Practice assessment",
      pending: "No assessment available", incomplete: "Partial assessment — see criteria below",
      unavailable: "Not assessed", priority: "Your top priority:", noFocus: "No supported priority returned.",
      improvements: "Your next step", disclaimer: "AI practice estimate for this essay, not an official Cambridge grade or Cambridge English Scale score. Review the evidence with your teacher.",
      courseIntro: "Targeted study suggestions, supported by quotations from your essay.",
      noCourse: "No targeted course-book recommendation is available for this response.",
      study: "Study Unit", correction: "Correction", suggestion: "Optional suggestion",
      corrected: "Only the listed corrections are applied below. Optional suggestions are not applied automatically.",
      criteria: ["Content", "Communicative achievement", "Organisation", "Language"],
      legacy: "This response has no supported assessment. Update the correction service to use the new assessment.",
      rejected: "Some edits could not be verified against the original and were omitted. Review the feedback before using it."
    },
    nl: {
      noEdits: "Voor deze tekst zijn geen concrete correcties of optionele herschrijvingen teruggegeven.",
      quick: "Samenvatting van je oefening",
      hint: "Feedback en een praktische volgende stap. Voor een volledige beoordeling is de opdracht nodig.",
      feedbackHint: "AI-schrijfadvies met voorbeelden uit je essay.",
      target: "Doelniveau",
      partial: "Opdracht ontbreekt of is onvolledig — alleen Organisatie en Taal beoordeeld.",

      title: "AI-oefenbeoordeling", score: "Geschatte taakpunten", summary: "Oefenbeoordeling",
      pending: "Nog geen beoordeling beschikbaar", incomplete: "Gedeeltelijke beoordeling — zie de criteria hieronder",
      unavailable: "Niet beoordeeld", priority: "Je belangrijkste aandachtspunt:", noFocus: "Geen onderbouwd aandachtspunt ontvangen.",
      improvements: "Je volgende stap", disclaimer: "AI-oefeninschatting voor dit essay, geen officieel Cambridge-cijfer of Cambridge English Scale-score. Bespreek de onderbouwing met je docent.",
      courseIntro: "Gerichte studietips met citaten uit je essay.", noCourse: "Voor dit resultaat is geen gericht cursusboekadvies beschikbaar.",
      study: "Bestudeer Unit", correction: "Correctie", suggestion: "Optionele suggestie",
      corrected: "Hieronder zijn alleen de vermelde correcties toegepast. Optionele suggesties worden niet automatisch toegepast.",
      criteria: ["Inhoud", "Communicatieve werking", "Organisatie", "Taal"],
      legacy: "Dit resultaat bevat geen onderbouwde beoordeling. Werk de correctieservice bij voor de nieuwe beoordeling.",
      rejected: "Enkele wijzigingen waren niet te controleren in het origineel en zijn weggelaten. Controleer de feedback voor gebruik."
    },
    es: {
      noEdits: "No se han devuelto correcciones concretas ni reformulaciones opcionales para este texto.",
      quick: "Resumen de práctica",
      hint: "Comentarios y un próximo paso práctico. La evaluación completa requiere el enunciado.",
      feedbackHint: "Comentarios de escritura con IA y ejemplos de tu ensayo.",
      target: "Nivel objetivo",
      partial: "Falta el enunciado completo — solo se evalúan Organización y Lengua.",

      title: "Evaluación de práctica con IA", score: "Puntos estimados de la tarea", summary: "Evaluación de práctica",
      pending: "Evaluación no disponible", incomplete: "Evaluación parcial — consulta los criterios",
      unavailable: "Sin evaluar", priority: "Tu prioridad principal:", noFocus: "No se ha recibido una prioridad fundamentada.",
      improvements: "Tu próximo paso", disclaimer: "Estimación de práctica con IA para este ensayo, no una nota oficial ni una puntuación de Cambridge English Scale. Revisa las pruebas con tu profesor.",
      courseIntro: "Sugerencias de estudio con citas de tu ensayo.", noCourse: "No hay una recomendación específica del libro para esta respuesta.",
      study: "Estudia la unidad", correction: "Corrección", suggestion: "Sugerencia opcional",
      corrected: "Solo se aplican las correcciones indicadas. Las sugerencias opcionales no se aplican automáticamente.",
      criteria: ["Contenido", "Eficacia comunicativa", "Organización", "Lengua"],
      legacy: "Esta respuesta no contiene una evaluación fundamentada. Actualiza el servicio de corrección.",
      rejected: "Se omitieron cambios que no se pudieron verificar en el original. Revisa los comentarios antes de usarlos."
    }
  };
  function copy(key) { return (COPY[detectUILang()] || COPY.en)[key]; }
  function assessmentLabels() {
    const hint=el.feedback?.closest('section')?.querySelector('.app-block__hint');
    if(hint) hint.textContent=copy('feedbackHint');
    const keys = {"bands.title":"title", "bands.overall_score":"score", "summary.estimated_band":"summary",
      "bands.improvement_title":"improvements", "bands.disclaimer":"disclaimer",
      "sections.next_draft_hint":"corrected", "summary.title":"quick", "summary.hint":"hint", "sections.feedback_hint":"feedbackHint", "bands.level_label":"target"};
    for (const [key,value] of Object.entries(keys))
      document.querySelectorAll(`[data-i18n="${key}"]`).forEach(n => n.textContent = copy(value));
  }
  function resetResults() {
    latestAssessment = null;
    window.EC_LAST_RESPONSE = null;
    for (const id of ["bandsCard", "vocabCard", "sentenceInsightsCard", "sentencesCard", "sentenceCard", "debugCard"])
      if (document.getElementById(id)) document.getElementById(id).hidden = true;
    for (const id of ["key-area", "band-estimate"])
      if (document.getElementById(id)) document.getElementById(id).textContent = copy("pending");
    if (el.nextDraft) el.nextDraft.value = "";
    if (el.feedback) el.feedback.textContent = "—";
    if (el.edits) el.edits.innerHTML = "";
    if ($("#feedback-card")) $("#feedback-card").innerHTML = "";
    if (el.outWC) el.outWC.textContent = "0";
    if ($("#debugJson")) $("#debugJson").textContent = "";
    refreshAdvancedVisibility();
  }
  function renderAssessment(response, level, essay) {
    latestAssessment = {response, level, essay};
    assessmentLabels();
    const card = $("#bandsCard"), list = $("#bandsCategories"), improvements = $("#bandsImprovements");
    if (!card || !list || !improvements) return;
    list.innerHTML = ""; improvements.innerHTML = "";
    const criteria = response.schemaVersion === 2 ? response.assessment?.criteria : null;
    const scores = [];
    ["content", "communicative", "organisation", "language"].forEach((key,i) => {
      const c = criteria?.[key];
      const evidence = Array.isArray(c?.evidence) ? c.evidence.filter(q => typeof q === "string" && q.length >= 8 && essay.includes(q)) : [];
      const missingTask = ["content", "communicative"].includes(key) && response.assessment?.taskSufficient !== true;
      const valid = !missingTask && Number.isInteger(c?.score) && c.score >= 0 && c.score <= 5 && evidence.length && c.reason;
      if (valid) scores.push(c.score);
      const li = document.createElement("li");
      const label = document.createElement("strong");
      label.textContent = `${copy("criteria")[i]}: ${valid ? c.score + " / 5" : copy("unavailable")}`;
      const reason = document.createElement("p"); reason.textContent = c?.reason || copy("legacy");
      li.append(label, reason);
      evidence.forEach(q => { const node = document.createElement("blockquote"); node.textContent = q; li.appendChild(node); });
      list.appendChild(li);
    });
    const total = scores.length === 4 ? `${scores.reduce((a,b)=>a+b,0)} / 20` : (response.assessment?.taskSufficient === false ? copy("partial") : copy("incomplete"));
    if ($("#bandsOverallScore")) $("#bandsOverallScore").textContent = total;
    if ($("#bandsLevel")) $("#bandsLevel").textContent = level;
    if ($("#band-estimate")) $("#band-estimate").textContent = criteria ? total : copy("pending");
    const f = response.schemaVersion === 2 ? response.keyFocus : null;
    const validFocus = typeof f?.evidence === "string" && f.evidence.length >= 8 && essay.includes(f.evidence) && f.action && f.explanation;
    if ($("#key-area")) $("#key-area").textContent = validFocus ? `${copy("priority")} ${f.action}` : copy("noFocus");
    const li = document.createElement("li");
    li.textContent = validFocus ? f.explanation : copy("noFocus");
    if (validFocus) { const q=document.createElement("blockquote"); q.textContent=f.evidence; li.appendChild(q); }
    improvements.appendChild(li); card.hidden = false;
  }

  // -----------------------------
  // Vocabulary suggestions
  // -----------------------------
  function renderVocabSuggestions(vs) {
    const card = $("#vocabCard");
    const list = $("#vocab");
    if (!card || !list) return;

    const entries = Object.entries(vs || {});
    if (!entries.length) {
      card.hidden = true;
      list.innerHTML = "";
      return;
    }

    const items = entries.map(([key, arr]) => {
      const alts = (Array.isArray(arr) ? arr : [String(arr)])
        .filter(Boolean)
        .map((a) =>
          `<button type="button" class="vocab-alt btn-ghost" ` +
          `data-key="${escapeHTML(key)}" data-to="${escapeHTML(a)}">` +
          `${escapeHTML(a)}</button>`
        )
        .join(" ");

      return `<li><strong>${escapeHTML(key)}</strong>` +
             `<div class="alt-row">${alts}</div></li>`;
    });

    list.innerHTML = items.join("");
    card.hidden = false;
  }

  // -----------------------------
  // Sentence insights
  // -----------------------------
  function renderSentenceInsights(list) {
    const card = $("#sentenceInsightsCard") || $("#sentencesCard") || $("#sentenceCard");
    const ul   = $("#sentenceInsightsList") || $("#sentencesList") || $("#sentenceList");
    if (!card || !ul) return;

    const items = Array.isArray(list) ? list : [];
    if (!items.length) {
      card.hidden = true;
      ul.innerHTML = "";
      return;
    }

    const html = items.map((raw) => {
      const example     = raw.example     ? String(raw.example)     : "";
      const issue       = raw.issue       ? String(raw.issue)       : "";
      const explanation = raw.explanation ? String(raw.explanation) : "";
      const linkHint    = raw.linkHint    ? String(raw.linkHint)    : "";

      let betterList = [];
      if (Array.isArray(raw.betterVersions)) {
        betterList = raw.betterVersions.map((v) => String(v)).filter(Boolean);
      } else if (raw.betterVersion) {
        betterList = [String(raw.betterVersion)];
      }

      const betterHtml = betterList.length
        ? `<div class="si-better"><strong>Better options:</strong> ` +
          betterList.map((v) => `<code>${escapeHTML(v)}</code>`).join(" / ") +
          `</div>`
        : "";

      const linkHtml = linkHint
        ? `<button type="button" class="si-link-btn" data-unit-link="${escapeHTML(linkHint)}">
             ${escapeHTML(linkHint)}
           </button>`
        : "";

      return `
        <li class="si-item">
          <p><strong>Example:</strong> ${escapeHTML(example)}</p>
          <p><strong>Issue:</strong> ${escapeHTML(issue)}</p>
          <p><strong>Why it matters:</strong> ${escapeHTML(explanation)}</p>
          ${betterHtml}
          ${linkHtml}
        </li>
      `;
    }).join("");

    ul.innerHTML = html;
    card.hidden = false;
  }

  // -----------------------------
  // Debug JSON
  // -----------------------------
  function renderDebugJson(data) {
    const card = $("#debugCard");
    const pre  = $("#debugJson");
    if (!card || !pre) return;

    if (!data) {
      pre.textContent = "";
      card.hidden = true;
      return;
    }

    try {
      pre.textContent = JSON.stringify(data, null, 2);
    } catch {
      pre.textContent = String(data);
    }
    // visibility controlled by toggle button
  }

  // -----------------------------
  // Button highlight helpers
  // -----------------------------

  function repairResultLayout() {
    const vocabNodes=$$('[id="vocab-suggestions"]');
    vocabNodes.slice(1).forEach(n=>n.closest('section')?.remove());
    for(const [oldId,cardId,listId] of [['vocab-suggestions','vocabCard','vocab'],['sentence-insights','sentenceInsightsCard','sentenceInsightsList']]) {
      const n=document.getElementById(oldId);
      if(n) { const oldCard=document.getElementById(cardId); if(oldCard && !oldCard.contains(n)) oldCard.remove(); n.id=listId; const section=n.closest('section'); if(section) {section.id=cardId;section.hidden=true;} }
    }
    const debug=$('#debug-info');
    if(debug) debug.closest('section')?.remove();
  }
  function refreshAdvancedVisibility() {
    const advanced=$('.ec-block--advanced');
    if(advanced) advanced.hidden=!['vocabCard','sentenceInsightsCard'].some(id=>{const n=document.getElementById(id);return n && !n.hidden;});
  }
  function renderExtras(response) {
    renderSentenceInsights(response.sentenceInsights || []);
    const list=$('#vocab'),card=$('#vocabCard');
    if(list && card) {
      list.replaceChildren();
      const details=Array.isArray(response.vocabularyDetails)?response.vocabularyDetails:[];
      for(const v of details) {
        const p=document.createElement('p');
        p.textContent=v.original+' → '+(v.alternatives || []).join(' / ');
        const q=document.createElement('blockquote');q.textContent=v.example || '';
        const why=document.createElement('p');why.textContent=v.explanation || '';
        list.append(p,q,why);
      }
      card.hidden=!details.length;
    }
    if(el.edits && !response.edits?.length) {
      const p=document.createElement('li');p.textContent=copy('noEdits');el.edits.replaceChildren(p);
    }
    refreshAdvancedVisibility();
  }

  function reflectLangButtons(lang) {
    const current = lang || localStorage.getItem("ec.lang") || "en";
    $$("[data-lang]").forEach((b) => {
      const active = (b.getAttribute("data-lang") || "en") === current;
      b.classList.toggle("btn-primary", active);
      b.classList.toggle("btn-ghost", !active);
      b.setAttribute("aria-pressed", String(active));
    });
  }

  function reflectLevelButtons(level) {
    const current = level || localStorage.getItem("ec.level") || "C1";
    $$("[data-level]").forEach((b) => {
      const active = (b.getAttribute("data-level") || "C1") === current;
      b.classList.toggle("pill--active", active);
      b.setAttribute("aria-pressed", String(active));
    });
  }

  // -----------------------------
  // Replace nearest occurrence (vocab one-click)
  // -----------------------------
  function replaceNearest(textarea, needle, replacement) {
    const value = textarea.value;
    const n = String(needle);
    if (!n) return false;

    const re = new RegExp(escapeForRegExp(n), "gi");
    let match;
    const matches = [];

    while ((match = re.exec(value)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length });
      if (re.lastIndex === match.index) re.lastIndex++;
    }
    if (!matches.length) return false;

    const caret = textarea.selectionStart ?? 0;
    let target = matches.find((m) => caret >= m.start && caret <= m.end);

    if (!target) {
      target = matches
        .map((m) => ({
          m,
          d: Math.min(Math.abs(caret - m.start), Math.abs(caret - m.end))
        }))
        .sort((a, b) => a.d - b.d)[0].m;
    }

    const before = value.slice(0, target.start);
    const after  = value.slice(target.end);
    const next   = before + replacement + after;

    textarea.value = next;
    const newCaret = before.length + replacement.length;
    textarea.setSelectionRange(newCaret, newCaret);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    return true;
  }

  // -----------------------------
  // SentenceInsight → open unit
  // -----------------------------
  function handleSentenceUnitOpen(btn) {
    const text = btn.getAttribute("data-unit-link")?.toLowerCase() || "";

    const unitNumber = Number(text.match(/\bunit\s+(\d{1,2})\b/i)?.[1]);
    const match = Number.isInteger(unitNumber) && unitNumber >= 1 && unitNumber <= 20
      ? `assets/book/reader.html?unit=${unitNumber}`
      : null;

    if (!match) {
      console.warn("No matching unit found for linkHint:", text);
      return;
    }

    window.open(match, "_blank", "noopener");
  }

  // -----------------------------
  // Utils
  // -----------------------------
  function wcCount(s) {
    const m = String(s || "").trim().match(/\S+/g);
    return m ? m.length : 0;
  }

  function escapeForRegExp(x) {
    return String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
    );
  }

  // -----------------------------
  // Initial setup
  // -----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    repairResultLayout();
    // initial paint
    reflectLangButtons();
    reflectLevelButtons();
    updateCounters();

    // Language buttons (EN/ES/NL) — single, reliable handler
    $$("[data-lang]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lang = btn.getAttribute("data-lang") || "en";
        localStorage.setItem("ec.lang", lang);
        reflectLangButtons(lang);

        if (window.I18N) {
          let p = null;
          if (typeof I18N.setLanguage === "function") p = I18N.setLanguage(lang);
          else if (typeof I18N.loadLanguage === "function") p = I18N.loadLanguage(lang);
          else if (typeof I18N.load === "function") p = I18N.load(lang);

          if (p && typeof p.then === "function") p.then(() => applyI18nToDom());
          else setTimeout(applyI18nToDom, 120);
        } else {
          applyI18nToDom();
        }
      });
    });

    // Level buttons
    $$("[data-level]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const level = btn.getAttribute("data-level") || "C1";
        localStorage.setItem("ec.level", level);
        reflectLevelButtons(level);
        requestSequence++; resetResults();
      });
    });

    // Clear
    if (el.btnClear) {
      el.btnClear.addEventListener("click", () => {
        requestSequence++; resetResults();
        if (el.task)      el.task.value = "";
        if (el.essay)     el.essay.value = "";
        if (el.nextDraft) el.nextDraft.value = "";
        if (el.feedback)  el.feedback.textContent = "—";
        if (el.edits)     el.edits.innerHTML = "";

        renderVocabSuggestions({});
        renderSentenceInsights([]);
        renderDebugJson(null);
        window.EC_LAST_RESPONSE = null;

        const dbgBtn = $("#btnToggleDebug");
        if (dbgBtn && window.I18N && I18N.t) dbgBtn.textContent = I18N.t("debug.show");

        setStatus("");
        updateCounters();
      });
    }

    // Correct
    if (el.btnCorrect) {
      el.btnCorrect.addEventListener("click", async (e) => {
        const level = localStorage.getItem("ec.level") || "C1";
        const payload = {
          level,
          task:  el.task ? (el.task.value || "") : "",
          essay: el.essay ? (el.essay.value || "") : ""
        };

        if (!payload.essay.trim()) {
          if (el.feedback) el.feedback.textContent = "Please write or paste your essay first.";
          return;
        }

        let res;
        const sequence = ++requestSequence;
        resetResults();

        try {
          // Busy ON
          e.target.disabled = true;
          e.target.classList.add("is-busy");
          e.target.setAttribute("aria-busy", "true");

          setStatus("status.correcting");

          res = await correctEssay(payload);

          if (sequence !== requestSequence) return;
          setFeedbackAndCourseHelp(res, payload.essay);
          if (el.nextDraft) el.nextDraft.value = res.schemaVersion === 2 ? (res.nextDraft || "") : "";

          if (el.edits) {
            el.edits.innerHTML = (res.schemaVersion === 2 && Array.isArray(res.edits) ? res.edits : [])
              .map((x) =>
                `<li><strong>${escapeHTML(copy(x.kind === "correction" ? "correction" : "suggestion"))}</strong>: ${escapeHTML(x.from)} → ` +
                `<em>${escapeHTML(x.to)}</em> — ${escapeHTML(x.reason)}</li>`
              )
              .join("");
          }

          // Word counters (both styles supported)
          if (typeof res.inputWords === "number" && el.inWC) {
            const hasTemplate = el.inWC.getAttribute("data-i18n-template") || /\{n\}/.test(el.inWC.textContent || "");
            if (hasTemplate) setCounter(el.inWC, "io.input_words", res.inputWords);
            else el.inWC.textContent = String(res.inputWords);
          }
          if (typeof res.outputWords === "number" && el.outWC) {
            const hasTemplate = el.outWC.getAttribute("data-i18n-template") || /\{n\}/.test(el.outWC.textContent || "");
            if (hasTemplate) setCounter(el.outWC, "io.output_words", res.outputWords);
            else el.outWC.textContent = String(res.outputWords);
          }

          renderVocabSuggestions(res.vocabularySuggestions || {});
          renderExtras(res);

          window.EC_LAST_RESPONSE = res;
          renderDebugJson(res);

          renderAssessment(res, level, payload.essay);
          if (res.schemaVersion !== 2 && el.feedback) {
            const note=document.createElement("p"); note.textContent=copy("legacy"); el.feedback.appendChild(note);
          }
          if (res.validationWarnings?.length && el.feedback) {
            const warning = document.createElement("p"); warning.textContent = copy("rejected");
            el.feedback.appendChild(warning);
          }
        } catch (err) {
          console.error("[EC] UI or API error:", err);
          if (sequence === requestSequence && el.feedback) el.feedback.textContent = "Correction could not be completed. Please try again.";
        } finally {
          // Busy OFF
          e.target.disabled = false;
          e.target.classList.remove("is-busy");
          e.target.removeAttribute("aria-busy");
          setStatus("");
        }
      });
    }

    // Course Book button
    const courseBtn = document.getElementById("btnCourseBook");
    if (courseBtn) {
      courseBtn.addEventListener("click", () => {
        window.open("assets/book/index.html", "_blank", "noopener");
      });
    }

    // Word count while typing
    for (const input of [el.essay, el.task]) if (input) input.addEventListener("input", () => {
      requestSequence++; resetResults(); updateCounters();
    });

    resetResults();

    // Apply translations once i18n has loaded (defer scripts)
    setTimeout(applyI18nToDom, 120);
  });

  // -----------------------------
  // Global delegated click handlers (single)
  // -----------------------------
  document.addEventListener("click", (e) => {
    // Debug toggle
    const debugBtn = e.target.closest("#btnToggleDebug");
    if (debugBtn) {
      const card = $("#debugCard");
      if (!card) return;

      const willShow = card.hidden;
      card.hidden = !card.hidden;

      if (window.I18N && I18N.t) {
        debugBtn.textContent = I18N.t(willShow ? "debug.hide" : "debug.show");
      } else {
        debugBtn.textContent = willShow ? "Hide advanced AI details" : "Show advanced AI details";
      }
      return;
    }

    // Vocab alt replacement
    const altBtn = e.target.closest(".vocab-alt");
    if (altBtn) {
      const key = altBtn.getAttribute("data-key") || "";
      const to  = altBtn.getAttribute("data-to")  || "";
      const targetTA = $("#nextDraft") || $("#essay");
      if (!targetTA) return;

      const ok = replaceNearest(targetTA, key, to);
      if (el.feedback) {
        el.feedback.textContent = ok
          ? `Replaced “${key}” → “${to}”.`
          : `Could not find "${key}" to replace.`;
      }
      return;
    }

    // Sentence unit open
    const unitBtn = e.target.closest(".si-link-btn");
    if (unitBtn) {
      handleSentenceUnitOpen(unitBtn);
      return;
    }
  });
})();
