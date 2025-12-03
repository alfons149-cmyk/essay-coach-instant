// feedback/mistake-map.js

// Helper: generate a few default keywords from the message text
function defaultKeywords(message) {
  return String(message || "")
    .toLowerCase()
    .split(/[^a-z]+/g)
    .filter((w) => w && w.length >= 5); // ignore very short words
}

// OPTIONAL: hand-crafted keyword overrides for specific mistakes
// (You can add / adjust these over time.)
const KEYWORDS = {
  subjectVerbAgreement: [
    "subject verb agreement",
    "subject–verb agreement",
    "subject-verb agreement",
    "verb does not agree",
    "people likes",
    "he go",
    "they goes",
  ],
  missingSubject: [
    "missing subject",
    "no subject",
    "who is doing",
    "unclear subject",
  ],
  missingMainVerb: [
    "missing main verb",
    "no main verb",
    "no finite verb",
  ],
  sentenceFragment: [
    "fragment",
    "not a complete sentence",
    "incomplete sentence",
  ],
  dependentClauseAlone: [
    "dependent clause cannot stand alone",
    "subordinate clause on its own",
    "because i",
    "although i",
  ],
  wordOrder: [
    "word order",
    "unnatural order",
    "strange word order",
  ],
  adverbFrequencyPosition: [
    "adverb of frequency",
    "position of adverb",
    "always often usually sometimes never",
  ],
  timePlaceMannerOrder: [
    "time place manner",
    "how where when",
    "order of time place and manner",
  ],
  splittingVerbObject: [
    "split the verb and object",
    "splitting the verb and its object",
    "verb and object together",
  ],
  questionWordOrder: [
    "question word order",
    "where you live",
    "do you live",
    "auxiliary before subject",
  ],
  runOnSentence: [
    "run-on sentence",
    "run on sentence",
    "two sentences are joined incorrectly",
  ],
  commaSplice: [
    "comma splice",
    "joined with a comma only",
    "two complete sentences with a comma",
  ],
  missingFullStop: [
    "missing full stop",
    "no full stop",
    "two sentences without punctuation",
  ],
  articleError: [
    "use of a an the",
    "wrong article",
    "missing article",
    "check your article",
    "a/an/the",
  ],
  uncountablePlural: [
    "uncountable noun",
    "uncountable plural",
    "many informations",
    "many advices",
    "pieces of advice",
  ],
  ifClauseForm: [
    "conditional",
    "if-clause",
    "second conditional",
    "first conditional",
  ],
  relativePronounError: [
    "relative pronoun",
    "who/which/that",
    "who which that",
  ],
  spellingCommonWord: [
    "spelling mistake",
    "spelling error",
    "common academic word",
    "environment",
    "government",
    "necessary",
    "definitely",
  ],
  tooInformal: [
    "too informal",
    "informal word",
    "kids these days",
    "stuff",
    "a lot of",
  ],
  contractionsInFormalWriting: [
    "avoid contractions",
    "don’t in formal writing",
    "can't in formal writing",
  ],
  overFormal: [
    "overly formal",
    "too formal",
    "sounds unnatural and formal",
  ],
  emotionalLanguage: [
    "emotional language",
    "too emotional",
    "very terrible",
    "completely ruined",
  ],
  veryPlusAdjective: [
    "very + adjective",
    "very good",
    "very bad",
    "very important",
  ],
  vagueVocabulary: [
    "vague word",
    "things",
    "stuff",
    "nice",
    "a lot of",
  ],
  redundantPhrases: [
    "redundant",
    "unnecessary words",
    "repeated idea",
  ],
  paddingExpressions: [
    "due to the fact that",
    "at this point in time",
    "the reason why is that",
  ],
  overusingConnectors: [
    "too many connectors",
    "overusing linking words",
    "too many linking words",
  ],
  repeatingSameConnector: [
    "repeat the same linking word",
    "same connector",
    "use a wider range of linkers",
  ],
  underLength: [
    "too short",
    "under the word limit",
    "aim for the full length",
  ],
  overLength: [
    "too long",
    "over the word limit",
    "very long answer",
  ],
};

// ---- UNIT ANCHORS (where in the book each topic lives) ----
const UNIT_ANCHORS = {
  // ===== UNIT 1 – Clauses, Phrases, and Sentences =====
  u1_clause:          { unit: 1, id: "u1-clause",          title: "What Is a Clause?" },
  u1_types_clauses:   { unit: 1, id: "u1-types-clauses",   title: "Types of Clauses" },
  u1_phrase:          { unit: 1, id: "u1-phrase",          title: "What Is a Phrase?" },
  u1_sentence:        { unit: 1, id: "u1-sentence",        title: "What Is a Sentence?" },
  u1_patterns:        { unit: 1, id: "u1-patterns",        title: "Sentence Patterns" },
  u1_two_types:       { unit: 1, id: "u1-two-types",       title: "Two Basic Sentence Types" },
  u1_types_sentences: { unit: 1, id: "u1-types-sentences", title: "Types of Sentences" },
  u1_connectors:      { unit: 1, id: "u1-connectors",      title: "Connecting Your Clauses" },
  u1_putting:         { unit: 1, id: "u1-putting",         title: "Putting It All Together" },
  u1_practice:        { unit: 1, id: "u1-practice",        title: "Quick Practice" },
  u1_final:           { unit: 1, id: "u1-final",           title: "Final Thoughts" },

  // ===== UNIT 2 – Word Order and Sentence Structure =====
  u2_word_order:      { unit: 2, id: "u2-word-order",      title: "Word Order Basics" },
  u2_adverbs:         { unit: 2, id: "u2-adverbs",         title: "Adverbs and Position" },
  u2_time_place:      { unit: 2, id: "u2-time-place",      title: "Time, Place, and Manner" },
  u2_questions:       { unit: 2, id: "u2-questions",       title: "Question Word Order" },
  u2_final:           { unit: 2, id: "u2-final",           title: "Final Thoughts" },
  u2_summary:         { unit: 2, id: "u2-summary",         title: "Summary & Quick Reference" },

  // ===== UNIT 3 – Types of Sentences and Connectors =====
  u3_sentence_types:  { unit: 3, id: "u3-sentence-types",  title: "Sentence Types" },
  u3_linking:         { unit: 3, id: "u3-linking",         title: "Basic Linking Words" },
  u3_connectors:      { unit: 3, id: "u3-connectors",      title: "Using Connectors" },
  u3_final:           { unit: 3, id: "u3-final",           title: "Final Thoughts" },
  u3_summary:         { unit: 3, id: "u3-summary",         title: "Summary & Quick Reference" },

  // ===== UNIT 4 – Punctuation and Sentence Flow =====
  u4_why_punctuation: { unit: 4, id: "u4-why-punctuation", title: "Why Punctuation Matters" },
  u4_full_stops:      { unit: 4, id: "u4-full-stops",      title: "Full Stops and Sentence Boundaries" },
  u4_commas:          { unit: 4, id: "u4-commas",          title: "Commas: Pauses, Lists, and Clauses" },
  u4_semicolons:      { unit: 4, id: "u4-semicolons-colons", title: "Semicolons and Colons" },
  u4_flow:            { unit: 4, id: "u4-flow",            title: "Punctuation and Sentence Flow" },
  u4_mistakes:        { unit: 4, id: "u4-mistakes",        title: "Common Punctuation Mistakes" },
  u4_practice:        { unit: 4, id: "u4-practice",        title: "Practice: Fix the Punctuation" },
  u4_final:           { unit: 4, id: "u4-final",           title: "Final Thoughts" },
  u4_summary:         { unit: 4, id: "u4-summary",         title: "Summary & Quick Reference" },

  // ===== UNIT 5 – Paragraph basics =====
  u5_paragraphs:      { unit: 5, id: "u5-paragraphs",      title: "What Is a Paragraph?" },
  u5_topic:           { unit: 5, id: "u5-topic-sentences", title: "Topic Sentences" },
  u5_support:         { unit: 5, id: "u5-support",         title: "Support and Examples" },
  u5_final:           { unit: 5, id: "u5-final",           title: "Final Thoughts" },
  u5_summary:         { unit: 5, id: "u5-summary",         title: "Summary & Quick Reference" },

  // ===== UNIT 6 – Cohesion and Coherence =====
  u6_cohesion:        { unit: 6, id: "u6-cohesion",        title: "Cohesion Devices" },
  u6_reference:       { unit: 6, id: "u6-reference",       title: "Reference and Substitution" },
  u6_paragraph_flow:  { unit: 6, id: "u6-flow",            title: "Paragraph Flow" },
  u6_final:           { unit: 6, id: "u6-final",           title: "Final Thoughts" },
  u6_summary:         { unit: 6, id: "u6-summary",         title: "Summary & Quick Reference" },

  // ===== UNIT 7 – Introductions & Conclusions (B2) =====
  u7_intro:           { unit: 7, id: "u7-intro",           title: "Writing Introductions" },
  u7_conclusion:      { unit: 7, id: "u7-conclusion",      title: "Writing Conclusions" },
  u7_final:           { unit: 7, id: "u7-final",           title: "Final Thoughts" },
  u7_summary:         { unit: 7, id: "u7-summary",         title: "Summary & Quick Reference" },

  // ===== UNIT 8 – Argument & Opinion =====
  u8_opinion:         { unit: 8, id: "u8-opinion",         title: "Stating Your Opinion" },
  u8_arguments:       { unit: 8, id: "u8-arguments",       title: "Developing Arguments" },
  u8_final:           { unit: 8, id: "u8-final",           title: "Final Thoughts" },
  u8_summary:         { unit: 8, id: "u8-summary",         title: "Summary & Quick Reference" },

  // ===== UNIT 9 – Examples & Development =====
  u9_examples:        { unit: 9, id: "u9-examples",        title: "Using Examples" },
  u9_development:     { unit: 9, id: "u9-development",     title: "Developing Paragraphs" },
  u9_final:           { unit: 9, id: "u9-final",           title: "Final Thoughts" },

  // ===== UNIT 10 – Planning B2 Essays =====
  u10_plan:           { unit: 10, id: "u10-plan",          title: "Planning B2 Essays" },
  u10_outline:        { unit: 10, id: "u10-outline",       title: "Building an Outline" },
  u10_final:          { unit: 10, id: "u10-final",         title: "Final Thoughts" },

  // ===== UNIT 11 – Editing B2 Essays =====
  u11_editing:        { unit: 11, id: "u11-editing",       title: "Editing B2 Essays" },
  u11_grammar:        { unit: 11, id: "u11-grammar",       title: "Grammar and Accuracy" },
  u11_style:          { unit: 11, id: "u11-style",         title: "Style and Clarity" },
  u11_final:          { unit: 11, id: "u11-final",         title: "Final Thoughts" },

  // ===== UNIT 12 – Confidence & Timing =====
  u12_underlength:    { unit: 12, id: "u12-underlength",   title: "Under-length Essays" },
  u12_overlength:     { unit: 12, id: "u12-overlength",    title: "Over-length Essays" },
  u12_editing:        { unit: 12, id: "u12-editing",       title: "Editing Under Time Pressure" },
  u12_routine:        { unit: 12, id: "u12-routine",       title: "Confidence Through Routine" },
  u12_final:          { unit: 12, id: "u12-final",         title: "Final Thoughts" },

  // ===== UNIT 13 – Understanding the C1 Essay Task =====
  u13_overview:       { unit: 13, id: "u13-overview",      title: "Understanding the C1 Essay Task" },
  u13_scale:          { unit: 13, id: "u13-scale",         title: "What’s Being Tested" },
  u13_structure:      { unit: 13, id: "u13-structure",     title: "Recommended Structure" },
  u13_language:       { unit: 13, id: "u13-language",      title: "Language and Register" },
  u13_final:          { unit: 13, id: "u13-final",         title: "Final Reflection" },

  // ===== UNIT 14 – Planning and Developing C1 Essays =====
  u14_balance:        { unit: 14, id: "u14-balance",       title: "Balancing Two Opinions" },
  u14_evaluation:     { unit: 14, id: "u14-evaluation",    title: "Planning with Evaluation" },
  u14_outline:        { unit: 14, id: "u14-outline",       title: "Building a C1 Outline" },
  u14_final:          { unit: 14, id: "u14-final",         title: "Final Reflection" },

  // ===== UNIT 15 – Writing and Linking C1 Paragraphs =====
  u15_paragraphs:     { unit: 15, id: "u15-paragraphs",    title: "C1 Paragraph Structure" },
  u15_flow:           { unit: 15, id: "u15-flow",          title: "Linking Within Paragraphs" },
  u15_linking:        { unit: 15, id: "u15-linking",       title: "Linking Between Paragraphs" },
  u15_final:          { unit: 15, id: "u15-final",         title: "Final Reflection" },

  // ===== UNIT 16 – Style, Tone, and Natural Formality =====
  u16_style:          { unit: 16, id: "u16-style",         title: "Style and Tone" },
  u16_formality:      { unit: 16, id: "u16-formality",     title: "Natural Formality" },
  u16_grammar:        { unit: 16, id: "u16-grammar",       title: "Formal Grammar Tools" },
  u16_final:          { unit: 16, id: "u16-final",         title: "Final Reflection" },

  // ===== UNIT 17 – Editing for Style and Precision =====
  u17_structure:      { unit: 17, id: "u17-structure",     title: "Structure-Level Editing" },
  u17_sentence:       { unit: 17, id: "u17-sentence",      title: "Sentence-Level Editing" },
  u17_word:           { unit: 17, id: "u17-word",          title: "Word-Level Precision" },
  u17_checklist:      { unit: 17, id: "u17-checklist",     title: "Editing Checklist" },
  u17_final:          { unit: 17, id: "u17-final",         title: "Final Reflection" },

  // ===== UNIT 18 – Writing for Impact — Academic Voice =====
  u18_voice:          { unit: 18, id: "u18-voice",         title: "What Is Academic Voice?" },
  u18_tone:           { unit: 18, id: "u18-tone",          title: "Tone and Perspective" },
  u18_presence:       { unit: 18, id: "u18-presence",      title: "Writing with Presence" },
  u18_final:          { unit: 18, id: "u18-final",         title: "Final Reflection" },

  // ===== UNIT 19 – Mastering the C2 Essay Task =====
  u19_task:           { unit: 19, id: "u19-task",          title: "The C2 Essay Task" },
  u19_reading:        { unit: 19, id: "u19-reading",       title: "Reading and Evaluating Texts" },
  u19_planning:       { unit: 19, id: "u19-planning",      title: "Planning a C2 Essay" },
  u19_model:          { unit: 19, id: "u19-model",         title: "Model C2 Essay" },
  u19_final:          { unit: 19, id: "u19-final",         title: "Final Reflection" },

  // ===== UNIT 20 – Refining the C2 Essay =====
  u20_elegance:       { unit: 20, id: "u20-elegance",      title: "Elegance in Writing" },
  u20_depth:          { unit: 20, id: "u20-depth",         title: "Depth and Nuance" },
  u20_style:          { unit: 20, id: "u20-style",         title: "Refined Style and Rhythm" },
  u20_model:          { unit: 20, id: "u20-model",         title: "Refined C2 Example" },
  u20_final:          { unit: 20, id: "u20-final",         title: "Final Reflection" },
};

// ---- RAW DATA (mistakes → units + anchors) ----
const RAW_MISTAKES = [
  // ===== UNIT 1 – sentence basics =====
  {
    id: "subjectVerbAgreement",
    message: "Check your subject–verb agreement in this sentence.",
    unit: 1,
    anchor: "u1_clause",
  },
  {
    id: "missingSubject",
    message: "This sentence seems to be missing a clear subject.",
    unit: 1,
    anchor: "u1_sentence",
  },
  {
    id: "missingMainVerb",
    message: "This group of words does not contain a main (finite) verb.",
    unit: 1,
    anchor: "u1_sentence",
  },
  {
    id: "sentenceFragment",
    message: "This looks like a fragment, not a complete sentence.",
    unit: 1,
    anchor: "u1_sentence",
  },
  {
    id: "dependentClauseAlone",
    message: "A dependent clause cannot stand alone as a sentence.",
    unit: 1,
    anchor: "u1_types_clauses",
  },
  {
    id: "tooManyClauses",
    message:
      "There are too many clauses in one sentence; consider splitting it.",
    unit: 1,
    anchor: "u1_patterns",
  },

  // ===== UNIT 2 – word order =====
  {
    id: "wordOrder",
    message: "The word order in this sentence is unnatural in English.",
    unit: 2,
    anchor: "u2_word_order",
  },
  {
    id: "adverbFrequencyPosition",
    message: "Check the position of the adverb of frequency.",
    unit: 2,
    anchor: "u2_adverbs",
  },
  {
    id: "timePlaceMannerOrder",
    message: "Time, place, and manner are in an unusual order here.",
    unit: 2,
    anchor: "u2_time_place",
  },
  {
    id: "questionWordOrder",
    message: "The word order in this question is not correct for English.",
    unit: 2,
    anchor: "u2_questions",
  },

  // ===== UNIT 3 – sentence types / connectors =====
  {
    id: "overusingConnectors",
    message:
      "You are using too many linking words; simplify the connections.",
    unit: 3,
    anchor: "u3_connectors",
  },
  {
    id: "repeatingSameConnector",
    message:
      "Try to use a wider range of linking words instead of repeating the same one.",
    unit: 3,
    anchor: "u3_connectors",
  },

  // ===== UNIT 4 – punctuation =====
  {
    id: "runOnSentence",
    message:
      "This looks like a run-on sentence; you may need a full stop or connector.",
    unit: 4,
    anchor: "u4_full_stops",
  },
  {
    id: "commaSplice",
    message: "Two complete sentences are joined with only a comma.",
    unit: 4,
    anchor: "u4_mistakes",
  },
  {
    id: "missingFullStop",
    message: "You may need a full stop here to separate two sentences.",
    unit: 4,
    anchor: "u4_full_stops",
  },

  // ===== UNIT 5 – paragraph basics =====
  {
    id: "noTopicSentence",
    message: "This paragraph would benefit from a clearer topic sentence.",
    unit: 5,
    anchor: "u5_topic",
  },

  // ===== UNIT 6 – cohesion =====
  {
    id: "cohesionIssue",
    message:
      "The connection between these sentences is not completely clear.",
    unit: 6,
    anchor: "u6_cohesion",
  },

  // ===== UNIT 7 – intros & conclusions =====
  {
    id: "weakIntroduction",
    message:
      "Your introduction could be clearer about the topic and your position.",
    unit: 7,
    anchor: "u7_intro",
  },
  {
    id: "missingConclusion",
    message: "Your essay would benefit from a clearer conclusion.",
    unit: 7,
    anchor: "u7_conclusion",
  },

  // ===== UNIT 8/9 – development / examples =====
  {
    id: "insufficientDevelopment",
    message:
      "This idea is not fully developed; consider adding an explanation or example.",
    unit: 9,
    anchor: "u9_development",
  },

  // ===== UNIT 10 – B2 planning =====
  {
    id: "noPlan",
    message:
      "The structure feels unclear; planning your main points first would help.",
    unit: 10,
    anchor: "u10_plan",
  },

  // ===== UNIT 11 – B2 editing =====
  {
    id: "redundantPhrases",
    message:
      "There are some redundant words that you could remove to tighten the sentence.",
    unit: 11,
    anchor: "u11_style",
  },
  {
    id: "paddingExpressions",
    message:
      "Try to replace this long expression with something more concise.",
    unit: 11,
    anchor: "u11_style",
  },

  // ===== UNIT 12 – confidence & timing / length =====
  {
    id: "underLength",
    message: "Your answer seems under the recommended word limit.",
    unit: 12,
    anchor: "u12_underlength",
  },
  {
    id: "overLength",
    message: "Your answer is longer than necessary; try to stay within the limit.",
    unit: 12,
    anchor: "u12_overlength",
  },

  // ===== UNIT 13 – C1 essay task =====
  {
    id: "onlyOneOpinion",
    message: "You need to discuss both given opinions in a C1 essay task.",
    unit: 13,
    anchor: "u13_overview",
  },

  // ===== UNIT 14 – C1 planning =====
  {
    id: "unbalancedArguments",
    message:
      "One side of the argument is much more developed than the other.",
    unit: 14,
    anchor: "u14_balance",
  },
  {
    id: "noEvaluation",
    message:
      "At C1 level, you should not only describe ideas but also evaluate them.",
    unit: 14,
    anchor: "u14_evaluation",
  },

  // ===== UNIT 15 – C1 paragraphs / linking =====
  {
    id: "weakLinking",
    message: "The link between these paragraphs could be smoother.",
    unit: 15,
    anchor: "u15_linking",
  },
  {
    id: "paragraphDepth",
    message:
      "This paragraph could go deeper into explanation or evaluation.",
    unit: 15,
    anchor: "u15_paragraphs",
  },

  // ===== UNIT 16 – style & tone =====
  {
    id: "tooInformal",
    message: "This expression is too informal for a Cambridge essay.",
    unit: 16,
    anchor: "u16_formality",
  },
  {
    id: "contractionsInFormalWriting",
    message: "Avoid contractions in formal exam writing.",
    unit: 16,
    anchor: "u16_formality",
  },
  {
    id: "overFormal",
    message: "The language here sounds overly formal or unnatural.",
    unit: 16,
    anchor: "u16_style",
  },
  {
    id: "emotionalLanguage",
    message:
      "Try to use more neutral, objective language instead of emotional words.",
    unit: 16,
    anchor: "u16_style",
  },
  {
    id: "veryPlusAdjective",
    message:
      "Instead of 'very + adjective', consider using a more precise word.",
    unit: 16,
    anchor: "u16_style",
  },
  {
    id: "vagueVocabulary",
    message: "This word is vague; you could choose something more specific.",
    unit: 16,
    anchor: "u16_style",
  },

  // ===== UNIT 17 – advanced editing =====
  {
    id: "wordySentence",
    message: "This sentence could be shorter and clearer.",
    unit: 17,
    anchor: "u17_sentence",
  },
  {
    id: "styleInconsistency",
    message:
      "The tone in this sentence does not match the rest of the essay.",
    unit: 17,
    anchor: "u17_word",
  },

  // ===== UNIT 18 – academic voice =====
  {
    id: "overPersonal",
    message:
      "Academic voice usually avoids overly personal or emotional phrasing.",
    unit: 18,
    anchor: "u18_voice",
  },

  // ===== UNIT 19 – C2 essay task =====
  {
    id: "overSummarising",
    message:
      "At C2 level, you should not only summarise but also evaluate the texts.",
    unit: 19,
    anchor: "u19_task",
  },

  // ===== UNIT 20 – refinement / elegance =====
  {
    id: "heavyStyle",
    message:
      "This part feels heavy; you could simplify the sentence for elegance.",
    unit: 20,
    anchor: "u20_elegance",
  },
];

// ---- BUILD AND EXPORT MISTAKE_MAP ----
export const MISTAKE_MAP = {};

RAW_MISTAKES.forEach((m) => {
  const anchorMeta = m.anchor ? UNIT_ANCHORS[m.anchor] : null;
  const unitFromAnchor = anchorMeta ? anchorMeta.unit : m.unit || null;
  const sectionId = anchorMeta ? anchorMeta.id : null;

  MISTAKE_MAP[m.id] = {
    id: m.id,
    label: m.label || m.message,
    description: m.message,
    unit: unitFromAnchor,
    sectionId,
    anchor: m.anchor || null,
    keywords: KEYWORDS[m.id] || defaultKeywords(m.message),
  };
});

export const MISTAKE_LIST = RAW_MISTAKES;
export { UNIT_ANCHORS, KEYWORDS };
