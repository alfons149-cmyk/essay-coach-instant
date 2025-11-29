// feedback-engine.js
// Detect mistake IDs from feedback text
// Adds a global: window.FeedbackEngine.detectMistakes()

import { MISTAKE_MAP } from "./mistake-map.js";

/**
 * Very simple keyword-based detection.
 * You can improve this later with AI or heuristics.
 *
 * @param {string} text – AI feedback text (plain text)
 * @returns {string[]} mistake IDs found in the feedback
 */
function detectMistakes(text) {
  if (!text) return [];

  const found = new Set();
  const lower = text.toLowerCase();

  for (const [id, data] of Object.entries(MISTAKE_MAP)) {
    // Check each keyword for this mistake
    if (!data.keywords || !data.keywords.length) continue;

    for (const kw of data.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        found.add(id);
        break;
      }
    }
  }

  return Array.from(found);
}

// Expose globally for app.js
window.FeedbackEngine = {
  detectMistakes
};
