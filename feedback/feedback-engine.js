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

  // we only need a reasonably distinctive snippet
  let snippet = String(rawSnippet).trim();
  // If there's an arrow, keep only the part before it
  if (snippet.includes("→")) {
    snippet = snippet.split("→")[0].trim();
  }
  // Avoid searching for extremely short / generic fragments
  if (snippet.length < 5) return null;

  const paragraphs = splitParagraphs(essay);
  for (const p of paragraphs) {
    if (p.text.includes(snippet)) {
      return p.index;
    }
  }
  return null;
}

/**
 * Decide which mistake ID best matches a piece of feedback text,
 * based on MISTAKE_MAP keywords (same logic as before, but per "entry").
 *
 * @param {string} entryText
 * @returns {string|null}
 */
function classifyEntry(entryText) {
  if (!entryText) return null;
  const lower = entryText.toLowerCase();

  let bestId = null;

  for (const [id, data] of Object.entries(MISTAKE_MAP)) {
    const kws = data.keywords || [];
    for (const kw of kws) {
      if (!kw) continue;
      if (lower.includes(String(kw).toLowerCase())) {
        bestId = id;
        break;
      }
    }
    if (bestId) break;
  }

  return bestId;
}

/**
 * Old behaviour: very simple keyword-based detection on the whole feedback text.
 * Returns only unique mistake IDs. Kept for backwards compatibility.
 *
 * @param {string} feedbackText – AI feedback text (plain text)
 * @returns {string[]} mistake IDs found in the feedback
 */
function detectMistakes(feedbackText) {
  const result = detectMistakesWithLocations(feedbackText, null);
  return result.ids;
}

/**
 * NEW: detect mistakes AND (best-effort) paragraph indices.
 *
 * We:
 *  1. Split the feedback into lines / entries.
 *  2. For each entry, classify it into a mistake ID (using the same keyword map).
 *  3. If an essay is provided, try to find which paragraph contains the
 *     original text (left side of "→"), and store that index.
 *
 * @param {string} feedbackText – AI feedback (e.g. your list of corrections)
 * @param {string|null} essayText – full essay text as entered by the student
 * @returns {{
 *   ids: string[],                  // unique mistake ids (for the UI)
 *   locationsById: {[id:string]: number|null}, // first paragraph index per id
 * }}
 */
function detectMistakesWithLocations(feedbackText, essayText) {
  if (!feedbackText) {
    return { ids: [], locationsById: {} };
  }

  const idsSet = new Set();
  const locationsById = {};

  // Very simple: treat each non-empty line as one "feedback entry".
  const entries = String(feedbackText)
    .split(/\r?\n+/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  for (const entry of entries) {
    const mistakeId = classifyEntry(entry);
    if (!mistakeId) continue;

    idsSet.add(mistakeId);

    // If we haven't recorded a paragraph for this id yet, try to find one.
    if (essayText && locationsById[mistakeId] == null) {
      const paraIndex = findParagraphIndex(essayText, entry);
      if (paraIndex != null) {
        locationsById[mistakeId] = paraIndex;
      }
    }
  }

  return {
    ids: Array.from(idsSet),
    locationsById,
  };
}

// Expose globally for app.js and other scripts
window.FeedbackEngine = {
  detectMistakes,
  detectMistakesWithLocations,
};
