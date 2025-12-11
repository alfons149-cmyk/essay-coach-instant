// js/app.js — EssayCoach UI (busy state + vocab + sentence insights + debug)

(() => {
  // ---- Global config / API ----
  window.EC = window.EC || {};
  const qs  = new URLSearchParams(location.search);
  const DEV = (typeof EC.DEV === "boolean") ? EC.DEV : (qs.get("dev") === "1");
  const API_BASE = (EC.API_BASE || "").replace(/\/+$/, "");

  console.log("[EC] API_BASE =", API_BASE || "(mock)", "DEV?", DEV);

  // ---- DOM helpers ----
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // ---- Element refs ----
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
    statusLine: document.getElementById("statusLine") // <p id="statusLine">
  };

  // ---- Status helper (shows "Correcting your essay…" etc.) ----
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

  // Optionally expose to other scripts if needed
  window.EC.setStatus = setStatus;

  // ---- Course Book helper bridge ----
  function setFeedbackAndCourseHelp(feedbackHtml) {
    if (!el.feedback) return;

    // Show feedback in the normal panel
    el.feedback.innerHTML = feedbackHtml || "—";

    try {
      const feedbackText =
        el.feedback.innerText || el.feedback.textContent || "";

      const essayText = el.essay ? (el.essay.value || "") : "";

      if (
        window.FeedbackEngine &&
        typeof window.FeedbackEngine.detectMistakesWithLocations === "function" &&
        window.FeedbackUI &&
        typeof window.FeedbackUI.renderFeedbackCardWithLocations === "function"
      ) {
        const result = window.FeedbackEngine.detectMistakesWithLocations(
          feedbackText,
          essayText
        );
        window.FeedbackUI.renderFeedbackCardWithLocations(result);
      } else if (
        window.FeedbackEngine &&
        typeof window.FeedbackEngine.detectMistakes === "function" &&
        window.FeedbackUI &&
        typeof window.FeedbackUI.renderFeedbackCard === "function"
      ) {
        const ids = window.FeedbackEngine.detectMistakes(feedbackText);
        window.FeedbackUI.renderFeedbackCard(ids);
      }
    } catch (err) {
      console.error("[EC] setFeedbackAndCourseHelp error:", err);
    }
  }

  function applyI18nToDom() {
  if (!window.I18N || typeof I18N.t !== "function") return;

  // Plain text nodes
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    const val = I18N.t(key);
    if (typeof val === "string" && val) {
      node.textContent = val;
    }
  });

  // Placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.getAttribute("data-i18n-placeholder");
    const val = I18N.t(key);
    if (typeof val === "string" && val) {
      node.setAttribute("placeholder", val);
    }
  });

  // Title attributes (tooltips)
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    const key = node.getAttribute("data-i18n-title");
    const val = I18N.t(key);
    if (typeof val === "string" && val) {
      node.setAttribute("title", val);
    }
  });

  // Refresh word-counter templates for the new language
  clearCounterTemplates();
  updateCounters();
}


  // ---- Corrector (live API or mock) ----
  async function correctEssay(payload) {
    if (!DEV && API_BASE) {
      const url = `${API_BASE}/correct`;
      console.log("[EC] POST", url, payload);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "omit"
      });

      const text = await res.text();
      console.log("[EC] /correct", res.status, text);

      if (!res.ok) {
        throw new Error(`API ${res.status}: ${text}`);
      }
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
// ---- Key Focus phrasing helper (EN / ES / NL) ----
function makeFriendlyKeyFocus(raw, lang = "en") {
  if (!raw || typeof raw !== "string") return "—";
  const text = raw.trim();

  // Check if already in teacher tone
  const alreadyFriendly = {
    en: [/^your top priority/i, /^focus on/i, /^you should/i],
    es: [/^tu prioridad/i, /^enfócate en/i, /^deberías/i],
    nl: [/^je belangrijkste/i, /^richt je op/i, /^je zou/i]
  };

  const rules = alreadyFriendly[lang] || alreadyFriendly.en;
  if (rules.some(r => r.test(text))) return text;

  // Language-specific rewrite
  switch (lang) {
    case "es": {
      const lowered = text.charAt(0).toLowerCase() + text.slice(1);
      return `Tu prioridad principal es ${lowered}`;
    }
    case "nl": {
      const lowered = text.charAt(0).toLowerCase() + text.slice(1);
      return `Je belangrijkste aandachtspunt is ${lowered}`;
    }
    default:
    case "en": {
      let phr = text;
      if (!phr.match(/^to\s+/i)) {
        phr = "to " + phr.charAt(0).toLowerCase() + phr.slice(1);
      }
      return `Your top priority is ${phr}`;
    }
  }
}  
  // ---- Initial setup ----
  document.addEventListener("DOMContentLoaded", () => {
    // Paint initial state
    reflectLangButtons();
    reflectLevelButtons();
    updateCounters();

    // 1) Language buttons (EN / ES / NL)
    const langButtons = $$("[data-lang]");
    langButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const lang = btn.getAttribute("data-lang") || "en";

        // remember choice
        localStorage.setItem("ec.lang", lang);

        // update button styles
        reflectLangButtons(lang);

            // tell i18n engine to actually switch language
    if (window.I18N) {
      if (typeof I18N.setLanguage === "function") {
        I18N.setLanguage(lang);
      } else if (typeof I18N.loadLanguage === "function") {
        I18N.loadLanguage(lang);
      } else if (typeof I18N.load === "function") {
        // fallback for your current i18n implementation
        I18N.load(lang);
      } else {
        console.warn("[i18n] No language switch function found");
      }
    }
      });
    });

    // 2) Level buttons (B2 / C1 / C2)
    const levelButtons = $$("[data-level]");
    levelButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const level = btn.getAttribute("data-level") || "C1";

        localStorage.setItem("ec.level", level);
        reflectLevelButtons(level);
      });
    });

    // 3) Clear button
    if (el.btnClear) {
      el.btnClear.addEventListener("click", () => {
        if (el.task)      el.task.value = "";
        if (el.essay)     el.essay.value = "";
        if (el.nextDraft) el.nextDraft.value = "";
        if (el.feedback)  el.feedback.textContent = "—";
        if (el.edits)     el.edits.innerHTML = "";
        renderVocabSuggestions({});
        renderSentenceInsights([]);
        renderDebugJson(null);
        window.EC_LAST_RESPONSE = null;

        // Optional: clear Course Book help card
        try {
          if (
            window.FeedbackUI &&
            typeof window.FeedbackUI.renderFeedbackCard === "function"
          ) {
            window.FeedbackUI.renderFeedbackCard("");
          }
        } catch (err) {
          console.warn("[FeedbackUI] could not clear card:", err);
        }

        const dbgBtn = $("#btnToggleDebug");
        if (dbgBtn && window.I18N && I18N.t) {
          dbgBtn.textContent = I18N.t("debug.show");
        }

        setStatus("");
        updateCounters();
      });
    }

    // 4) Correct button
    if (el.btnCorrect) {
      el.btnCorrect.addEventListener("click", async (e) => {
        const level = localStorage.getItem("ec.level") || "C1";
        const payload = {
          level,
          task:  el.task ? el.task.value || "" : "",
          essay: el.essay ? el.essay.value || "" : ""
        };

        if (!payload.essay.trim()) {
          if (el.feedback) {
            el.feedback.textContent = "Please write or paste your essay first.";
          }
          return;
        }

        let res;

        try {
          // Busy state ON
          e.target.disabled = true;
          e.target.classList.add("is-busy");
          e.target.setAttribute("aria-busy", "true");

          // Show status line while correcting
          setStatus("status.correcting");

          // Call Worker / mock
          res = await correctEssay(payload);

          // Render main results
          setFeedbackAndCourseHelp(res.feedback || "—");
          if (el.nextDraft) el.nextDraft.value = res.nextDraft || "";

          if (el.edits) {
            el.edits.innerHTML = (res.edits || [])
              .map((x) =>
                `<li><strong>${escapeHTML(x.from)}</strong> → ` +
                `<em>${escapeHTML(x.to)}</em> — ${escapeHTML(x.reason)}</li>`
              )
              .join("");
          }

          // Word counters
          setCounter(el.inWC,  "io.input_words",  res.inputWords  ?? 0);
          setCounter(el.outWC, "io.output_words", res.outputWords ?? 0);

          // Extra cards
          renderVocabSuggestions(res.vocabularySuggestions || {});
          renderSentenceInsights(res.sentenceInsights || []);

          // Debug JSON
          window.EC_LAST_RESPONSE = res;
          renderDebugJson(res);

          // Bands (if scoreEssay exists)
          if (typeof window.scoreEssay === "function") {
            const scores = {
              content: 0.7,
              communicative: 0.6,
              organisation: 0.8,
              language: 0.55
            };
            renderBands(level, scores);
          }
        } catch (err) {
          console.error("[EC] UI or API error:", err);
          if (!res && el.feedback) {
            el.feedback.textContent =
              "⚠️ Correction failed. Check API, CORS, or dev mode.";
          }
        } finally {
          // Busy state OFF
          e.target.disabled = false;
          e.target.classList.remove("is-busy");
          e.target.removeAttribute("aria-busy");
          setStatus("");
        }
      });
    }
  });

  // Global click handler for debug toggle + vocab replacements
  document.addEventListener("click", (e) => {
    // Debug toggle button
    const debugBtn = e.target.closest("#btnToggleDebug");
    if (debugBtn) {
      const card = $("#debugCard");
      if (!card) return;

      const willShow = card.hidden;
      card.hidden = !card.hidden;

      if (window.I18N && I18N.t) {
        debugBtn.textContent = I18N.t(willShow ? "debug.hide" : "debug.show");
      } else {
        debugBtn.textContent = willShow
          ? "Hide advanced AI details"
          : "Show advanced AI details";
      }
      return;
    }

    // One-click vocab replacement
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
  });

  // Separate handler for Course Book button
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btnCourseBook");
    if (!btn) return;
    btn.addEventListener("click", () => {
      window.open("assets/book/index.html", "_blank", "noopener");
    });
  });
 
// 1) Language buttons (EN / ES / NL)
const langButtons = $$("[data-lang]");
langButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const lang = btn.getAttribute("data-lang") || "en";

    // remember choice
    localStorage.setItem("ec.lang", lang);

    // update button styles
    reflectLangButtons(lang);

    // tell i18n engine to actually switch language
    if (window.I18N) {
      let p = null;

      if (typeof I18N.setLanguage === "function") {
        p = I18N.setLanguage(lang);
      } else if (typeof I18N.loadLanguage === "function") {
        p = I18N.loadLanguage(lang);
      } else if (typeof I18N.load === "function") {
        p = I18N.load(lang);
      }

      // If your i18n loader is async, wait for it;
      // otherwise just apply after a tiny delay.
      if (p && typeof p.then === "function") {
        p.then(() => applyI18nToDom());
      } else {
        setTimeout(applyI18nToDom, 150);
      }
    } else {
      applyI18nToDom();
    }
  });
      // Apply translations once on initial load
    applyI18nToDom();

});


  // Live word count while typing
  if (el.essay) {
    el.essay.addEventListener("input", updateCounters);
  }

  // ---- Counters ----
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
    if (!el.essay || !el.inWC || !el.outWC) return;
    const wc = wcCount(el.essay.value);
    setCounter(el.inWC,  "io.input_words",  wc);
    setCounter(el.outWC, "io.output_words", wc);
  }

// ======================================================
// Detect UI language (en / es / nl)
// ======================================================
function detectUILang() {
  // Prefer whatever the i18n engine thinks
  if (window.I18N) {
    if (typeof I18N.getLanguage === "function") {
      const v = I18N.getLanguage();
      if (v) return String(v).slice(0, 2).toLowerCase();
    }
    if (typeof I18N.lang === "string") {
      return I18N.lang.slice(0, 2).toLowerCase();
    }
    if (typeof I18N.language === "string") {
      return I18N.language.slice(0, 2).toLowerCase();
    }
  }

  // Fallback: what we store when you click the language buttons
  const stored = localStorage.getItem("ec.lang");
  if (stored) return stored.slice(0, 2).toLowerCase();

  // Last resort: <html lang="…">
  const htmlLang = document.documentElement.lang;
  if (htmlLang) return htmlLang.slice(0, 2).toLowerCase();

  return "en";
}

// ======================================================
// Turn raw improvement text into friendly “Key focus”
// ======================================================
function makeFriendlyKeyFocus(raw, lang = "en") {
  if (!raw || typeof raw !== "string") return "—";
  const text = raw.trim();

  // Already student-friendly?
  const alreadyFriendly = {
    en: [/^your top priority/i, /^focus on/i, /^you should/i],
    es: [/^tu prioridad/i, /^enfócate en/i, /^deberías/i],
    nl: [/^je belangrijkste/i, /^richt je op/i, /^je zou/i]
  };

  const rules = alreadyFriendly[lang] || alreadyFriendly.en;
  if (rules.some((r) => r.test(text))) return text;

  // Language-specific wrap
  switch (lang) {
    case "es": {
      const lowered = text.charAt(0).toLowerCase() + text.slice(1);
      return `Tu prioridad principal es ${lowered}`;
    }
    case "nl": {
      const lowered = text.charAt(0).toLowerCase() + text.slice(1);
      return `Je belangrijkste aandachtspunt is ${lowered}`;
    }
    default:
    case "en": {
      let phr = text;
      if (!phr.match(/^to\s+/i)) {
        phr = "to " + phr.charAt(0).toLowerCase() + phr.slice(1);
      }
      return `Your top priority is ${phr}`;
    }
  }
}


 // ---- Bands card ----
function renderBands(level, scores) {
  if (typeof window.scoreEssay !== "function") {
    console.warn("[bands] scoreEssay is not available");
    return;
  }
  const res = scoreEssay(level, scores);
  if (!res) return;

  const card      = $("#bandsCard");
  const overallEl = $("#bandsOverallScore");
  const levelEl   = $("#bandsLevel");
  const catList   = $("#bandsCategories");
  const impList   = $("#bandsImprovements");

  if (!card || !overallEl || !levelEl || !catList || !impList) return;

  // Detailed bands card
  overallEl.textContent = res.overall_scale || "—";
  levelEl.textContent   = res.level;

  catList.innerHTML = "";
  res.category_results.forEach((cr) => {
    const li   = document.createElement("li");
    const key  = `bands.category.${cr.category}`;
    const label = (window.I18N && I18N.t) ? I18N.t(key) : cr.category;
    const bandKey   = `bands.band.${cr.band}`;
    const bandLabel = (window.I18N && I18N.t) ? I18N.t(bandKey) : cr.band;

    li.innerHTML =
      `<strong>${label}</strong>: ${bandLabel} (${cr.score_range})<br>` +
      `<span style="font-size:0.9em;opacity:0.9;">${cr.descriptor}</span>`;
    catList.appendChild(li);
  });

  const uniqImprovements = Array.from(new Set(res.improvement_summary || []));
  impList.innerHTML = "";
  uniqImprovements.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    impList.appendChild(li);
  });

  card.hidden = false;

    // ✅ Update the compact "Summary" panel
  const miniBand  = document.getElementById("band-estimate");
  const miniFocus = document.getElementById("key-area");

  if (miniBand) {
    const levelLabel = res.level || "";              // e.g. "C1"
    const scale      = res.overall_scale || "";      // e.g. "187"

    if (levelLabel && scale) {
      miniBand.textContent =
        `${levelLabel} level – around ${scale} on the Cambridge English Scale`;
    } else if (levelLabel) {
      miniBand.textContent = `${levelLabel} level`;
    } else if (scale) {
      miniBand.textContent =
        `Around ${scale} on the Cambridge English Scale`;
    } else {
      miniBand.textContent = "—";
    }
  }

  if (miniFocus) {
  const firstImprovement =
    (res.improvement_summary && res.improvement_summary[0]) || "";

  const lang = detectUILang();
  miniFocus.textContent = makeFriendlyKeyFocus(firstImprovement, lang);
}
  
}

  // ---- Vocabulary suggestions ----
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

  // ---- Sentence insights ----
  function renderSentenceInsights(list) {
    const card = $("#sentenceInsightsCard") ||
                 $("#sentencesCard") ||
                 $("#sentenceCard");
    const ul   = $("#sentenceInsightsList") ||
                 $("#sentencesList") ||
                 $("#sentenceList");
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
        ? `<button class="si-link-btn" data-unit-link="${escapeHTML(linkHint)}">
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

  // ---- Debug JSON ----
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
    } catch (e) {
      pre.textContent = String(data);
    }
    // visibility controlled by toggle button
  }

  // ---- Button highlight helpers ----
  function reflectLangButtons(lang) {
    const current = lang || localStorage.getItem("ec.lang") || "en";
    $$("[data-lang]").forEach((b) => {
      const active = b.getAttribute("data-lang") === current;
      b.classList.toggle("btn-primary", active);
      b.classList.toggle("btn-ghost", !active);
      b.setAttribute("aria-pressed", String(active));
    });
  }

  function makeFriendlyKeyFocus(raw) {
  if (!raw || typeof raw !== "string") return "—";

  const trimmed = raw.trim();

  // If AI already starts with friendly wording, keep it
  if (
    trimmed.match(/^your top priority/i) ||
    trimmed.match(/^focus on/i) ||
    trimmed.match(/^you should/i)
  ) {
    return trimmed;
  }

  // Otherwise rewrite into student-friendly language
  return `Your top priority is to ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}


  function reflectLevelButtons(level) {
    const current = level || localStorage.getItem("ec.level") || "C1";
    $$("[data-level]").forEach((b) => {
      const active = b.getAttribute("data-level") === current;
      b.classList.toggle("pill--active", active);
      b.setAttribute("aria-pressed", String(active));
    });
  }

  // ---- Replace nearest occurrence ----
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
          d: Math.min(
            Math.abs(caret - m.start),
            Math.abs(caret - m.end)
          )
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

  // ---- Utils ----
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

  // =====================
  // SentenceInsight → open unit
  // =====================
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".si-link-btn");
    if (!btn) return;

    const text = btn.getAttribute("data-unit-link")?.toLowerCase() || "";

    // Unit lookup table (matches "unit 5", "unit 3", etc.)
    const UNIT_LINKS = {
      "unit 1": "assets/book/units/unit01.html",
      "unit 2": "assets/book/units/unit02.html",
      "unit 3": "assets/book/units/unit03.html",
      "unit 4": "assets/book/units/unit04.html",
      "unit 5": "assets/book/units/unit05.html",
      "unit 6": "assets/book/units/unit06.html",
      "unit 7": "assets/book/units/unit07.html"
    };

    // Find which unit number appears in the linkHint text
    let match = null;
    for (const key of Object.keys(UNIT_LINKS)) {
      if (text.includes(key)) {
        match = UNIT_LINKS[key];
        break;
      }
    }

    if (!match) {
      console.warn("No matching unit found for linkHint:", text);
      return;
    }

    window.open(match, "_blank", "noopener");
  });

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
    );
  }
})();
