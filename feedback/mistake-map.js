// --- Helper: build correct reader URL ---
export function getUnitUrl(unitId) {
  return `/essay-coach-instant/book/reader.html?unit=${unitId}`;
}

// --- Mistake → Unit Map ---
// Each entry has:
// id: internal name
// message: what the student did wrong
// unit: which unit teaches the correction
// link: generated reader link

export const mistakeMap = [
  {
    id: "subjectVerbAgreement",
    message: "Check your subject–verb agreement.",
    unit: 1,
    link: getUnitUrl(1)
  },
  {
    id: "wordOrder",
    message: "Your word order is unclear.",
    unit: 2,
    link: getUnitUrl(2)
  },
  {
    id: "connectors",
    message: "You used a connector incorrectly.",
    unit: 3,
    link: getUnitUrl(3)
  },
  {
    id: "punctuation",
    message: "Punctuation affects clarity.",
    unit: 4,
    link: getUnitUrl(4)
  },
  {
    id: "sentenceLength",
    message: "Your sentence may be too long or run-on.",
    unit: 5,
    link: getUnitUrl(5)
  }
];
