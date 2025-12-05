// feedback/feedback-ui.js

import { MISTAKE_MAP } from "./mistake-map.js";

/**
 * Build the reader link: assets/book/reader.html?unit=11#u11-level2
 */
function buildReaderLink(mistake) {
  if (!mistake || !mistake.unit) return null;

  // Remember where the user is (the essay page)
  const returnUrl = encodeURIComponent(window.location.href);

  // Base: reader with unit + return URL
  let url = `assets/book/reader.html?unit=${mistake.unit}&return=${returnUrl}`;

  // Optional: jump to the exact section inside that unit
  if (mistake.sectionId) {
    url += `#${mistake.sectionId}`;
  }

  return url;
}

/**
 * Render a pretty feedback card into a container element.
 *
 * @param {string[]} mistakeIds – keys that exist in MISTAKE_MAP
 * @param {HTMLElement} containerEl – where the card should appear
 * @param {{[id:string]:number}|null} locationsById – optional paragraph indices
 */
export function renderFeedbackCard(
  mistakeIds,
  containerEl,
  locationsById = null
) {
  if (!containerEl) return;

  // Clean previous content
  containerEl.innerHTML = "";

  // Outer card
  const card = document.createElement("section");
  card.className = "ec-feedback-card";

  const header = document.createElement("header");
  header.className = "ec-feedback-card__header";

  const title = document.createElement("h2");
  title.className = "ec-feedback-card__title";
  title.textContent = "Improve this essay";

  const subtitle = document.createElement("p");
  subtitle.className = "ec-feedback-card__subtitle";
  subtitle.textContent =
    "These suggestions are based on the mistakes detected in your answer. Click a link to open the relevant part of the course book.";

  header.appendChild(title);
  header.appendChild(subtitle);
  card.appendChild(header);

  // No mistakes / nothing to show
  if (!mistakeIds || mistakeIds.length === 0) {
    const ok = document.createElement("p");
    ok.className = "ec-feedback-card__empty";
    ok.textContent =
      "No major issues detected. You can still review the course book if you want to polish your writing even further.";
    card.appendChild(ok);
    containerEl.appendChild(card);
    return;
  }

  const list = document.createElement("ul");
  list.className = "ec-feedback-list";

  mistakeIds.forEach((id) => {
    const m = MISTAKE_MAP[id];
    if (!m) return;

    const item = document.createElement("li");
    item.className = "ec-feedback-item";

    const main = document.createElement("div");
    main.className = "ec-feedback-item__main";

    const label = document.createElement("h3");
    label.className = "ec-feedback-item__label";
    label.textContent = m.label || "Issue";

    const desc = document.createElement("p");
    desc.className = "ec-feedback-item__desc";
    desc.textContent =
      m.description ||
      "There seems to be an issue here. Review this area in the course book.";

    main.appendChild(label);
    main.appendChild(desc);

    // Optional: paragraph location
    const paraIndex =
      locationsById && typeof locationsById[id] === "number"
        ? locationsById[id]
        : null;

    if (paraIndex != null) {
      const location = document.createElement("p");
      location.className = "ec-feedback-item__location";
      location.textContent = `This refers to paragraph ${paraIndex} of your essay.`;
      main.appendChild(location);
    }

    item.appendChild(main);

    const linkUrl = buildReaderLink(m);
    if (linkUrl) {
      const link = document.createElement("a");
      link.className = "ec-feedback-item__link";
      link.href = linkUrl;
      link.target = "_blank"; // open book in new tab so they don’t lose their essay
      link.rel = "noopener noreferrer";
      link.textContent = `Study this in Unit ${m.unit}`;
      item.appendChild(link);
    }

    list.appendChild(item);
  });

  card.appendChild(list);

  const footer = document.createElement("footer");
  footer.className = "ec-feedback-card__footer";
  footer.textContent =
    "Tip: fix one group of mistakes at a time (articles, verbs, connectors, etc.). Small corrections add up quickly.";

  card.appendChild(footer);
  containerEl.appendChild(card);
}

/**
 * Optional helper if you want to test quickly from the console:
 *
 *   EC_FEEDBACK_DEMO(['articles_missing', 'runOnSentence', ...])
 */
window.EC_FEEDBACK_DEMO = function (mistakeIds) {
  const container = document.querySelector("#feedback-card");
  if (!container) return;
  renderFeedbackCard(mistakeIds, container);
};

/* 🔽 Global adapter for app.js 🔽 */
if (!window.FeedbackUI) {
  window.FeedbackUI = {};
}

/**
 * Backwards-compatible helper:
 *   FeedbackUI.renderFeedbackCard(mistakeIds)
 */
window.FeedbackUI.renderFeedbackCard = function (mistakeIds) {
  const container = document.querySelector("#feedback-card");
  if (!container) return;
  renderFeedbackCard(mistakeIds, container);
};

/**
 * NEW helper for using paragraph locations:
 *   const result = FeedbackEngine.detectMistakesWithLocations(feedbackText, essayText);
 *   FeedbackUI.renderFeedbackCardWithLocations(result);
 */
window.FeedbackUI.renderFeedbackCardWithLocations = function (result) {
  if (!result) return;
  const container = document.querySelector("#feedback-card");
  if (!container) return;

  const ids = result.ids || [];
  const locations = result.locationsById || null;
  renderFeedbackCard(ids, container, locations);
};
