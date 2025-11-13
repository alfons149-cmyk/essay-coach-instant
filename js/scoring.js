// js/scoring.js
function bandFromScore(value) {
  if (value < 0.45) return "low";
  if (value < 0.75) return "mid";
  return "high";
}

// Take the midpoint of the textual score_range, e.g. "166–172" -> 169
function midpoint(range) {
  const parts = range.split("–").map(s => parseInt(s.trim(), 10));
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return Math.round((parts[0] + parts[1]) / 2);
}

/**
 * level: "B2" | "C1" | "C2"
 * scores: { content:0–1, communicative:0–1, organisation:0–1, language:0–1 }
 */
function scoreEssay(level, scores) {
  const rubric = (window.CAMBRIDGE_RUBRIC_EN || {})[level];
  if (!rubric) return null;

  const categories = [
    { key: "Content",          score: scores.content },
    { key: "Communicative_Achievement", score: scores.communicative },
    { key: "Organisation",     score: scores.organisation },
    { key: "Language",         score: scores.language }
  ];

  const categoryResults = [];
  const scaleValues = [];

  const improvements = [];

  for (const cat of categories) {
    const band = bandFromScore(cat.score);
    const bandData = rubric[cat.key][band];
    categoryResults.push({
      category: cat.key,
      band,
      score_range: bandData.score_range,
      descriptor: bandData.descriptor,
      improvement: bandData.improvement
    });

    const mid = midpoint(bandData.score_range);
    if (mid != null) scaleValues.push(mid);

    // Collect only mid/low improvements to give concrete tips
    if (band !== "high") {
      improvements.push(bandData.improvement);
    }
  }

  const overallScale =
    scaleValues.length ? Math.round(scaleValues.reduce((a, b) => a + b, 0) / scaleValues.length) : null;

  return {
    level,
    overall_scale: overallScale,          // e.g. 168
    category_results: categoryResults,    // per-criterion
    improvement_summary: improvements     // array of strings
  };
}
