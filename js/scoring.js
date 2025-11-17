// js/scoring.js
// Turns 0–1 scores into Cambridge-style band + improvements

(() => {
  const LEVELS = ['B2', 'C1', 'C2'];
  const CATS   = ['Content', 'Communicative_Achievement', 'Organisation', 'Language'];

  function clamp01(x) {
    x = Number(x);
    if (!Number.isFinite(x)) return 0.5;
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
  }

  function scaleForLevel(level, s) {
    s = clamp01(s);
    let base = 160, span = 40;
    if (level === 'B2') { base = 140; span = 50; }
    else if (level === 'C1') { base = 160; span = 40; }
    else if (level === 'C2') { base = 180; span = 50; }
    return Math.round(base + s * span);
  }

  function pickBand(level, category, s) {
    const rubric = (window.CAMBRIDGE_RUBRIC || {})[level];
    if (!rubric || !rubric[category]) return null;
    let band = 'mid';
    if (s < 0.45) band = 'low';
    else if (s > 0.75) band = 'high';

    const bandData = rubric[category][band];
    if (!bandData) return null;

    return {
      band,
      score_range: bandData.score_range,
      descriptor: bandData.descriptor,
      improvements: bandData.improvements || []
    };
  }

  function scoreEssay(level, scores) {
    if (!LEVELS.includes(level)) level = 'C1';

    let sum = 0, n = 0;
    const category_results = [];
    const improvement_summary = [];

    for (const cat of CATS) {
      // scores keys are likely: content, communicative, organisation, language
      const keyGuess =
        cat === 'Communicative_Achievement'
          ? 'communicative'
          : cat.toLowerCase();

      const raw = scores && (scores[keyGuess] ?? scores[cat] ?? 0.5);
      const v   = clamp01(raw);
      sum += v; n++;

      const info = pickBand(level, cat, v);
      if (info) {
        category_results.push({
          category: cat,
          band: info.band,
          score_range: info.score_range,
          descriptor: info.descriptor
        });
        improvement_summary.push(...info.improvements);
      }
    }

    const avg = n ? sum / n : 0.5;
    const overall_scale = scaleForLevel(level, avg);

    return {
      level,
      overall_scale,
      category_results,
      improvement_summary
    };
  }

  window.scoreEssay = scoreEssay;
})();
