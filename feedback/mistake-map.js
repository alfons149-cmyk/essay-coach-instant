// Which units you have + their titles.
// Adjust titles/numbers to match your real book.
export const UNIT_META = {
  1: { title: "Clauses, Phrases, and Sentences" },
  2: { title: "Word Order and Sentence Structure" },
  3: { title: "Types of Sentences and Connectors" },
  4: { title: "Punctuation and Sentence Flow" },
  5: { title: "Paragraphs and Topic Sentences" },        // adjust name if needed
  6: { title: "Developing Paragraphs" },                 // adjust
  7: { title: "Understanding the Cambridge Task" },      // adjust
  8: { title: "Planning B2 Essays" },                    // adjust
  9: { title: "Writing B2 Paragraphs" },                 // adjust
  10: { title: "Style and Register at B2" },             // adjust
  11: { title: "Editing for Accuracy" },
  12: { title: "Confidence and Time Management" },       // adjust
  13: { title: "From B2 to C1: Essay Structure" },       // adjust
  14: { title: "Planning and Developing C1 Essays" },
  15: { title: "Writing and Linking C1 Paragraphs" },
  16: { title: "Style, Tone, and Natural Formality" },
  17: { title: "Editing for Style and Precision" },
  18: { title: "Writing for Impact — Academic Voice" },
  19: { title: "Mastering the C2 Essay Task" },
  20: { title: "Refining the C2 Essay — Elegance, Depth, and Nuance" }
};

export const MISTAKE_META = {
  // UNIT 1 – basic sentence control
  u1_frag: {
    unit: 1,
    label: "Sentence fragment (incomplete sentence)"
  },
  u1_runon: {
    unit: 1,
    label: "Run-on sentence / missing full stop"
  },
  u1_missing_subj: {
    unit: 1,
    label: "Missing subject"
  },
  u1_missing_verb: {
    unit: 1,
    label: "Missing verb"
  },
  u1_dep_clause_alone: {
    unit: 1,
    label: "Dependent clause used as a full sentence"
  },
  u1_phrase_as_sentence: {
    unit: 1,
    label: "Phrase used as a sentence"
  },

  // UNIT 2 – word order & adverbs
  u2_word_order: {
    unit: 2,
    label: "Unnatural word order"
  },
  u2_adv_freq: {
    unit: 2,
    label: "Adverb of frequency in wrong position"
  },
  u2_split_verb_obj: {
    unit: 2,
    label: "Splitting verb and object incorrectly"
  },
  u2_time_middle: {
    unit: 2,
    label: "Time phrase in wrong position"
  },
  u2_manner_place_time: {
    unit: 2,
    label: "Wrong Manner–Place–Time order"
  },
  u2_question_order: {
    unit: 2,
    label: "Incorrect question word order"
  },

  // UNIT 3 – sentence types & connectors
  u3_missing_connector: {
    unit: 3,
    label: "Clauses not connected with a linker"
  },
  u3_wrong_connector: {
    unit: 3,
    label: "Inappropriate connector choice"
  },
  u3_overusing_and: {
    unit: 3,
    label: "Overuse of 'and' instead of varied linkers"
  },
  u3_comma_fanboys: {
    unit: 3,
    label: "Missing comma before FANBOYS (and/but/so...)"
  },
  u3_double_connector: {
    unit: 3,
    label: "Using 'although ... but' or similar double linkers"
  },
  u3_semicolon_error: {
    unit: 3,
    label: "Incorrect use of semicolon"
  },
  u3_choppy: {
    unit: 3,
    label: "Many short, choppy sentences"
  },

  // UNIT 4 – punctuation & flow
  u4_comma_missing: {
    unit: 4,
    label: "Missing important comma"
  },
  u4_comma_overuse: {
    unit: 4,
    label: "Too many commas"
  },
  u4_fullstop_missing: {
    unit: 4,
    label: "Missing full stop between ideas"
  },
  u4_capitalisation: {
    unit: 4,
    label: "Capital letter error"
  },
  u4_list_punctuation: {
    unit: 4,
    label: "Incorrect list punctuation"
  },
  u4_intro_clause_comma: {
    unit: 4,
    label: "No comma after introductory clause"
  },

  // UNIT 5 – paragraphs
  u5_missing_paragraphs: {
    unit: 5,
    label: "No clear paragraphs"
  },
  u5_topic_sentence_missing: {
    unit: 5,
    label: "No clear topic sentence"
  },
  u5_idea_not_grouped: {
    unit: 5,
    label: "Ideas not grouped by paragraph"
  },

  // UNIT 7–10 – task fulfilment, tone, register
  u7_missed_note: {
    unit: 7,
    label: "Task note from question is missing"
  },
  u7_no_opinion: {
    unit: 7,
    label: "No clear opinion / conclusion"
  },
  u8_weak_plan: {
    unit: 8,
    label: "Weak or unclear essay structure"
  },
  u9_no_topic: {
    unit: 9,
    label: "Paragraph without clear main idea"
  },
  u10_informal_vocab: {
    unit: 10,
    label: "Informal vocabulary in a formal essay"
  },
  u10_very_adj: {
    unit: 10,
    label: "Overuse of 'very + adjective'"
  },

  // UNIT 11 – editing for accuracy (core accuracy mistakes)
  u11_spelling: {
    unit: 11,
    label: "Spelling mistake"
  },
  u11_article: {
    unit: 11,
    label: "Article misuse (a / an / the)"
  },
  u11_sva: {
    unit: 11,
    label: "Subject–verb agreement error"
  },
  u11_tense: {
    unit: 11,
    label: "Verb tense error"
  },
  u11_rel_clause: {
    unit: 11,
    label: "Relative clause (who/which/that) error"
  },
  u11_if_clause: {
    unit: 11,
    label: "If-clause / conditional error"
  },
  u11_uncountable_plural: {
    unit: 11,
    label: "Uncountable noun used in plural (advices, informations)"
  },
  u11_plural_error: {
    unit: 11,
    label: "Incorrect plural form"
  },
  u11_word_choice: {
    unit: 11,
    label: "Inaccurate word choice"
  },
  u11_collocation: {
    unit: 11,
    label: "Wrong collocation (e.g. *do a research*)"
  },
  u11_repetition: {
    unit: 11,
    label: "Repetition of the same word too often"
  },

  // UNIT 16 – style & tone
  u16_too_informal: {
    unit: 16,
    label: "Tone too informal for Cambridge essay"
  },
  u16_too_formal: {
    unit: 16,
    label: "Over-formal / unnatural tone"
  },
  u16_contractions: {
    unit: 16,
    label: "Contractions used in formal writing"
  },

  // UNIT 17 – style & precision
  u17_redundant: {
    unit: 17,
    label: "Redundant words / long-winded sentence"
  },
  u17_vague: {
    unit: 17,
    label: "Vague vocabulary (things, stuff, a lot of)"
  },
  u17_wordy_linkers: {
    unit: 17,
    label: "Overlong / mechanical linking phrases"
  },

  // UNIT 18 – voice & impact
  u18_no_voice: {
    unit: 18,
    label: "No clear academic voice"
  },
  u18_over_template: {
    unit: 18,
    label: "Overuse of memorised templates"
  },

  // UNIT 19 – C2 essay task
  u19_no_evaluation: {
    unit: 19,
    label: "Summarising texts but not evaluating them"
  },
  u19_no_synthesis: {
    unit: 19,
    label: "No comparison / synthesis between the two texts"
  },

  // UNIT 20 – elegance, depth, nuance
  u20_overcomplicated: {
    unit: 20,
    label: "Unnecessarily complicated sentences"
  },
  u20_no_nuance: {
    unit: 20,
    label: "Arguments lack nuance or balance"
  }
};
