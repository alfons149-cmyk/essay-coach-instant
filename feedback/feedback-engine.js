// feedback-engine.js
// Detect mistake IDs from feedback text (optionally with paragraph locations)
// Adds a global: window.FeedbackEngine.detectMistakes() and
// window.FeedbackEngine.detectMistakesWithLocations()

import { MISTAKE_MAP } from "./mistake-map.js";

/**
 * Split essay into paragraphs.
 * Paragraph = blocks separated by one or more blank lines.
 *
 * @param {string} essay
 * @returns {{index:number,text:string}[]}
 */
function splitParagraphs(essay) {
  if (!essay) return [];
  return String(essay)
    .trim()
    .split(/\n\s*\n+/) // one or more blank lines
    .map((p, i) => ({
      index: i + 1,      // 1-based
      text: p.trim(),
    }))
    .filter(p => p.text.length > 0);
}

/**
 * Find which paragraph contains a given snippet from the essay.
 *
 * @param {string} essay
 * @param {string} rawSnippet   – typically the "original" side of a suggestion line
 * @returns {number|null}       – 1-based paragraph index or null
 */
function findParagraphIndex(essay, rawSnippet) {
  if (!essay || !rawSnippet) return null;

  let snippet = String(rawSnippet).trim();
  // If there's an arrow, keep only the part before it
  if (snippet.includes("→")) {
    snippet = snippet.split("→")[0].trim();
  }
  if (snippet.length < 5) return null; // too short / generic

  const paragraphs = splitParagraphs(essay);
  for (const p of paragraphs) {
    if (p.text.includes(snippet)) {
      return p.index;
    }
  }
  return null;
}

/**
 * ORIGINAL behaviour: keyword-based detection on the whole feedback text.
 * Returns ALL matching mistake IDs (not just one).
 *
 * @param {string} text – AI feedback text (plain text)
 * @returns {string[]} mistake IDs found in the feedback
 */
function detectMistakes(text) {
  if (!text) return [];

  const found = new Set();
  const lower = String(text).toLowerCase();

  for (const [id, data] of Object.entries(MISTAKE_MAP)) {
    const kws = data.keywords || [];
    if (!kws.length) continue;

    for (const kw of kws) {
      if (!kw) continue;
      if (lower.includes(String(kw).toLowerCase())) {
        found.add(id);
        break; // go to next mistake id
      }
    }
  }

  return Array.from(found);
}

/**
 * NEW: detect mistakes AND (best-effort) paragraph indices.
 *
 * Strategy:
 *  1. Use the original detectMistakes() on the whole feedback text to get
 *     ALL relevant mistake IDs (so we don't lose results).
 *  2. If essay text is available, split the feedback into lines, and for
 *     each line:
 *        - run detectMistakes(line) to see which IDs that line relates to
 *        - find which paragraph in the essay that line's original snippet
 *          belongs to
 *        - record the paragraph index for those IDs (first one wins)
 *
 * @param {string} feedbackText – AI feedback (your list of corrections)
 * @param {string|null} essayText – full essay text from the student
 * @returns {{
 *   ids: string[],
 *   locationsById: {[id:string]: number}
 * }}
 */
function detectMistakesWithLocations(feedbackText, essayText) {
  if (!feedbackText) {
    return { ids: [], locationsById: {} };
  }

  const ids = detectMistakes(feedbackText);
  const locationsById = {};

  if (essayText && ids.length > 0) {
    // Treat each non-empty line as one "feedback entry"
    const entries = String(feedbackText)
      .split(/\r?\n+/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    for (const entry of entries) {
      // Which mistake ids does THIS line talk about?
      const entryIds = detectMistakes(entry);
      if (!entryIds.length) continue;

      const paraIndex = findParagraphIndex(essayText, entry);
      if (paraIndex == null) continue;

      entryIds.forEach((id) => {
        if (locationsById[id] == null) {
          locationsById[id] = paraIndex;
        }
      });
    }
  }

  return { ids, locationsById };
}

// Expose globally for app.js
window.FeedbackEngine = {
  detectMistakes,
  detectMistakesWithLocations,
};
