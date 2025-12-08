// js/app.js — EssayCoach UI (busy state + vocab + sentence insights + debug)

(() => {
  // ---- Global config / API ----
  window.EC = window.EC || {};
  const qs  = new URLSearchParams(location.search);
  const DEV = (typeof EC.DEV === "boolean") ? EC.DEV : (qs.get("dev") === "1");
  const API_BASE = (EC.API_BASE || "").replace(/\/+$/, "");

  console.log("[EC] API_BASE =", API_BASE || "(mock)", "DEV?", DEV);

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
    statusLine: document.getElementById("statusLine")
  };

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



  // If i18n is available, translate the key. Otherwise just show the key.
  if (window.I18N && typeof window.I18N.t === "function") {
    statusEl.textContent = window.I18N.t(i18nKey);
  } else {
    statusEl.textContent = i18nKey;
  }
}


  // If it's an i18n key, translate; otherwise use raw text
  if (window.I18N && typeof I18N.t === "function") {
    el.statusLine.textContent = I18N.t(keyOrText) || "";
  } else {
    el.statusLine.textContent = keyOrText;
  }
}


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

  // ---- Initial setup ----
  document.addEventListener("DOMContentLoaded", () => {
    reflectLangButtons();
    reflectLevelButtons();
    updateCounters();
  });


  // ---- Main click handler ----
 // ---- Main click handler ----
el.btnCorrect.addEventListener("click", async () => {
  // guard clauses – keep whatever you had (empty essay check, etc.)

  try {
    // Start busy state
    el.btnCorrect.classList.add("is-busy");
    setStatus("status.correcting");   // i18n key

    // === YOUR EXISTING CORRECTION LOGIC GOES HERE ===
    // Example (this is just illustrative):
    //
    // const taskText  = (el.task.value || "").trim();
    // const essayText = (el.essay.value || "").trim();
    // const result    = await correctEssay(taskText, essayText);
    // renderFeedback(result);
    // renderEdits(result);
    // updateWordCounts(result);

  } catch (err) {
    console.error(err);
    // optional: show an error message instead of empty
    setStatus(""); 
  } finally {
    // Stop busy state & clear status
    el.btnCorrect.classList.remove("is-busy");
    setStatus("");
  }
});



    // Level switch
    if (levelBtn) {
      const level = levelBtn.getAttribute("data-level");
      localStorage.setItem("ec.level", level);
      reflectLevelButtons(level);
      return;
    }

        // Clear button
    if (e.target === el.btnClear) {
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

      updateCounters();
      return;
    }

    document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnCourseBook');
  if (!btn) return;
  btn.addEventListener('click', () => {
    window.open('assets/book/index.html', '_blank', 'noopener');
  });
});

    // Correct button
    if (e.target === el.btnCorrect) {
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

        if (el.feedback) {
          if (window.I18N && typeof I18N.t === "function") {
            el.feedback.textContent = I18N.t("status.correcting");
          } else {
            el.feedback.textContent =
              "Correcting your essay… this may take a little while.";
          }
        }

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
      }

      return;
    }

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

    impList.innerHTML = "";
    const uniqImprovements = Array.from(new Set(res.improvement_summary));
    uniqImprovements.forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      impList.appendChild(li);
    });

    card.hidden = false;
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
    "unit 7": "assets/book/units/unit07.html",
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
