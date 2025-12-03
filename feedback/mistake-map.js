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
    "they goes"
  ],
  missingSubject: [
    "missing subject",
    "no subject",
    "who is doing",
    "unclear subject"
  ],
  missingMainVerb: [
    "missing main verb",
    "no main verb",
    "no finite verb"
  ],
  sentenceFragment: [
    "fragment",
    "not a complete sentence",
    "incomplete sentence"
  ],
  dependentClauseAlone: [
    "dependent clause cannot stand alone",
    "subordinate clause on its own",
    "because i",
    "although i"
  ],
  wordOrder: [
    "word order",
    "unnatural order",
    "strange word order"
  ],
  adverbFrequencyPosition: [
    "adverb of frequency",
    "position of adverb",
    "always often usually sometimes never"
  ],
  timePlaceMannerOrder: [
    "time place manner",
    "how where when",
    "order of time place and manner"
  ],
  splittingVerbObject: [
    "split the verb and object",
    "splitting the verb and its object",
    "verb and object together"
  ],
  questionWordOrder: [
    "question word order",
    "where you live",
    "do you live",
    "auxiliary before subject"
  ],
  runOnSentence: [
    "run-on sentence",
    "run on sentence",
    "two sentences are joined incorrectly"
  ],
  commaSplice: [
    "comma splice",
    "joined with a comma only",
    "two complete sentences with a comma"
  ],
  missingFullStop: [
    "missing full stop",
    "no full stop",
    "two sentences without punctuation"
  ],
  articleError: [
    "use of a an the",
    "wrong article",
    "missing article",
    "check your article",
    "a/an/the"
  ],
  uncountablePlural: [
    "uncountable noun",
    "uncountable plural",
    "many informations",
    "many advices",
    "pieces of advice"
  ],
  ifClauseForm: [
    "conditional",
    "if-clause",
    "second conditional",
    "first conditional"
  ],
  relativePronounError: [
    "relative pronoun",
    "who/which/that",
    "who which that"
  ],
  spellingCommonWord: [
    "spelling mistake",
    "spelling error",
    "common academic word",
    "environment",
    "government",
    "necessary",
    "definitely"
  ],
  tooInformal: [
    "too informal",
    "informal word",
    "kids these days",
    "stuff",
    "a lot of"
  ],
  contractionsInFormalWriting: [
    "avoid contractions",
    "don’t in formal writing",
    "can't in formal writing"
  ],
  overFormal: [
    "overly formal",
    "too formal",
    "sounds unnatural and formal"
  ],
  emotionalLanguage: [
    "emotional language",
    "too emotional",
    "very terrible",
    "completely ruined"
  ],
  veryPlusAdjective: [
    "very + adjective",
    "very good",
    "very bad",
    "very important"
  ],
  vagueVocabulary: [
    "vague word",
    "things",
    "stuff",
    "nice",
    "a lot of"
  ],
  redundantPhrases: [
    "redundant",
    "unnecessary words",
    "repeated idea"
  ],
  paddingExpressions: [
    "due to the fact that",
    "at this point in time",
    "the reason why is that"
  ],
  overusingConnectors: [
    "too many connectors",
    "overusing linking words",
    "too many linking words"
  ],
  repeatingSameConnector: [
    "repeat the same linking word",
    "same connector",
    "use a wider range of linkers"
  ],
  underLength: [
    "too short",
    "under the word limit",
    "aim for the full length"
  ],
  overLength: [
    "too long",
    "over the word limit",
    "very long answer"
  ]
  // You can keep adding overrides as you like
};

// ---- UNIT ANCHORS (where in the book each topic lives) ----
// NOTE: `id` should match the HTML id of the section in book/units/unitXX.html.
// If any of these differ from your actual markup, just tweak the `id` strings.

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
  // (adjust ids to match your actual unit02.html sections)
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


  // ===== UNIT 5 – (Paragraph basics / topic sentences etc.) =====
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


  // ===== UNIT 7 – Introductions & Conclusions (for B2) =====
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

  // ===== UNIT 20 – Refining the C2 Essay: Elegance, Depth, Nuance =====
  u20_elegance:       { unit: 20, id: "u20-elegance",      title: "Elegance in Writing" },
  u20_depth:          { unit: 20, id: "u20-depth",         title: "Depth and Nuance" },
  u20_style:          { unit: 20, id: "u20-style",         title: "Refined Style and Rhythm" },
  u20_model:          { unit: 20, id: "u20-model",         title: "Refined C2 Example" },
  u20_final:          { unit: 20, id: "u20-final",         title: "Final Reflection" }
};

// ---- RAW MISTAKE DEFINITIONS ----
// Each entry says which UNIT_ANCHORS key explains this mistake best.
const RAW_MISTAKES = {
  subjectVerbAgreement: {
    label: "Subject–verb agreement",
    description:
      "Some verbs do not agree with their subjects in number or person. Review how subjects and verbs match.",
    anchorKey: "u1_patterns", // sentence patterns & agreement
  },
  missingSubject: {
    label: "Missing subject",
    description:
      "Some clauses are missing a clear subject. Every finite verb needs a subject.",
    anchorKey: "u1_clause",
  },
  missingMainVerb: {
    label: "Missing main verb",
    description:
      "Some sentences have no main (finite) verb and are therefore incomplete.",
    anchorKey: "u1_sentence",
  },
  sentenceFragment: {
    label: "Sentence fragments",
    description:
      "You have sentence fragments that cannot stand alone as full sentences.",
    anchorKey: "u1_types_sentences",
  },
  dependentClauseAlone: {
    label: "Dependent clause alone",
    description:
      "A dependent clause with words like because, although or if cannot stand alone as a sentence.",
    anchorKey: "u1_connectors",
  },
  wordOrder: {
    label: "Word order",
    description:
      "Some sentences use an unnatural or incorrect word order.",
    anchorKey: "u2_word_order",
  },
  adverbFrequencyPosition: {
    label: "Adverbs of frequency – position",
    description:
      "Review where to place adverbs of frequency (always, often, usually, sometimes, never) in the sentence.",
    anchorKey: "u2_adverbs",
  },
  timePlaceMannerOrder: {
    label: "Time, place, and manner",
    description:
      "The order of time, place, and manner is sometimes unnatural. Review typical word order in English.",
    anchorKey: "u2_time_place",
  },
  splittingVerbObject: {
    label: "Splitting verb and object",
    description:
      "Try not to separate the verb from its object unnecessarily.",
    anchorKey: "u2_word_order",
  },
  questionWordOrder: {
    label: "Question word order",
    description:
      "Check the word order in questions (auxiliary before subject).",
    anchorKey: "u2_questions",
  },
  runOnSentence: {
    label: "Run-on sentences",
    description:
      "Two or more independent clauses are joined incorrectly (run-on sentence).",
    anchorKey: "u3_sentence_types",
  },
  commaSplice: {
    label: "Comma splice",
    description:
      "Two complete sentences are joined with only a comma. Review correct ways to join clauses.",
    anchorKey: "u3_connectors",
  },
  missingFullStop: {
    label: "Missing full stop",
    description:
      "You sometimes join two sentences without a full stop.",
    anchorKey: "u3_sentence_types",
  },
  articleError: {
    label: "Articles – a/an/the",
    description:
      "Check your use of a, an and the with singular and plural nouns.",
    // TODO: point this to your real articles section anchor if you have one
    anchorKey: "u3_summary",
  },
  uncountablePlural: {
    label: "Uncountable nouns in plural",
    description:
      "Some uncountable nouns (information, advice, etc.) are incorrectly used in the plural.",
    // TODO: update anchorKey if you have a dedicated uncountable-nouns section
    anchorKey: "u3_summary",
  },
  ifClauseForm: {
    label: "If-clauses and conditionals",
    description:
      "Review the forms of common conditional sentences (if-clauses).",
    anchorKey: "u3_sentence_types",
  },
  relativePronounError: {
    label: "Relative pronouns",
    description:
      "Review who, which and that in relative clauses.",
    anchorKey: "u3_connectors",
  },
  spellingCommonWord: {
    label: "Spelling of common academic words",
    description:
      "There are spelling mistakes in common academic or high-frequency words.",
    anchorKey: "u1_practice",
  },
  tooInformal: {
    label: "Too informal",
    description:
      "Some expressions are too informal for this type of writing.",
    anchorKey: "u3_final",
  },
  contractionsInFormalWriting: {
    label: "Contractions in formal writing",
    description:
      "Avoid contractions (don't, can't, I'm, etc.) in formal essays.",
    anchorKey: "u3_final",
  },
  overFormal: {
    label: "Overly formal",
    description:
      "Some phrases sound overly formal and unnatural for modern academic writing.",
    anchorKey: "u3_final",
  },
  emotionalLanguage: {
    label: "Emotional language",
    description:
      "Try to avoid very emotional or exaggerated language in academic writing.",
    anchorKey: "u3_final",
  },
  veryPlusAdjective: {
    label: "Very + adjective",
    description:
      "Use a more precise adjective instead of “very + basic adjective”.",
    anchorKey: "u3_final",
  },
  vagueVocabulary: {
    label: "Vague vocabulary",
    description:
      "Replace vague words (things, stuff, nice, a lot of, etc.) with more precise vocabulary.",
    anchorKey: "u3_summary",
  },
  redundantPhrases: {
    label: "Redundant phrases",
    description:
      "Some expressions repeat the same idea and can be removed.",
    anchorKey: "u3_summary",
  },
  paddingExpressions: {
    label: "Padding expressions",
    description:
      "Expressions like “due to the fact that” make sentences longer without adding meaning.",
    anchorKey: "u3_summary",
  },
  overusingConnectors: {
    label: "Too many connectors",
    description:
      "You use too many linking words. Choose only the ones you really need.",
    anchorKey: "u3_connectors",
  },
  repeatingSameConnector: {
    label: "Repeating the same connector",
    description:
      "Use a wider range of linking words instead of repeating the same one.",
    anchorKey: "u3_connectors",
  },
  underLength: {
    label: "Too short",
    description:
      "Your answer is under the word limit. Aim for the full length.",
    anchorKey: "u1_final",
  },
  overLength: {
    label: "Too long",
    description:
      "Your answer is over the word limit. Try to be more concise.",
    anchorKey: "u1_final",
  },
};
// ---- BUILD FINAL MISTAKE_MAP (exported) ----

export const MISTAKE_MAP = Object.fromEntries(
  Object.entries(RAW_MISTAKES).map(([id, cfg]) => {
    const anchor = cfg.anchorKey ? UNIT_ANCHORS[cfg.anchorKey] : null;

    return [
      id,
      {
        id,
        label: cfg.label,
        description: cfg.description,
        unit: anchor ? anchor.unit : undefined,
        sectionId: anchor ? anchor.id : undefined,
        // keywords used by the detection engine (fall back to defaults)
        keywords: KEYWORDS[id] || defaultKeywords(cfg.description),
      },
    ];
  })
);

// (Optional) export helpers if other files need them
export { KEYWORDS, UNIT_ANCHORS };

// ---- Exported map: id → metadata ----
export const MISTAKE_MAP = {};

// Turn the array into an object, add keywords, and derive unit + sectionId
RAW_MISTAKES.forEach((m) => {
  const anchorMeta = m.anchor ? UNIT_ANCHORS[m.anchor] : null;

  const unitFromAnchor = anchorMeta ? anchorMeta.unit : undefined;
  const sectionId = anchorMeta ? anchorMeta.id : null;

  MISTAKE_MAP[m.id] = {
    id: m.id,
    label: m.label || m.message,           // short title shown in UI
    description: m.message,                // longer explanation
    // unit used by feedback-ui.buildReaderLink(m)
    unit: unitFromAnchor || m.unit || null,
    // sectionId used for the #... part of the URL
    sectionId,
    // keep the original anchor key if you want it elsewhere
    anchor: m.anchor || null,
    // keywords for detection
    keywords: KEYWORDS[m.id] || defaultKeywords(m.message),
  };
});

// Optional: export the raw list too, if anything else uses it
export const MISTAKE_LIST = RAW_MISTAKES;
