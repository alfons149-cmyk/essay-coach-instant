import { mistakeMap } from "./mistake-map.js";

export function generateFeedback(detectedMistakes) {
  const feedbackItems = detectedMistakes.map(code => {
    const match = mistakeMap.find(m => m.id === code);
    if (!match) return null;

    return `
      <div class="feedback-item">
        <p>${match.message}</p>
        <a class="feedback-link" href="${match.link}" target="_blank">
          Study this in Unit ${match.unit}
        </a>
      </div>
    `;
  });

  return `
    <div class="feedback-container">
      <h2>Your Feedback</h2>
      ${feedbackItems.join("")}
    </div>
  `;
}

