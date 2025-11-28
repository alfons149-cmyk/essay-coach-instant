// --- Helper: build correct reader URL ---
export function getUnitUrl(unitId) {
  return `/essay-coach-instant/book/reader.html?unit=${unitId}`;
}

// --- Mistake → Unit Map ---
// Each entry:
// id: internal name used by the app
// message: what the student sees
// unit: which book unit explains/fixes it
// link: deep link into the reader

export const mistakeMap = [
  // ========================
  // UNIT 1 – Clauses, phrases, basic sentences
  // ========================
  {
    id: "subjectVerbAgreement",
    message: "Check your subject–verb agreement in this sentence.",
    unit: 1,
    link: getUnitUrl(1)
  },
  {
    id: "missingSubject",
    message: "This sentence seems to be missing a clear subject.",
    unit: 1,
    link: getUnitUrl(1)
  },
  {
    id: "missingMainVerb",
    message: "This group of words does not contain a main verb.",
    unit: 1,
    link: getUnitUrl(1)
  },
  {
    id: "sentenceFragment",
    message: "This looks like a fragment, not a complete sentence.",
    unit: 1,
    link: getUnitUrl(1)
  },
  {
    id: "dependentClauseAlone",
    message: "A dependent clause cannot stand alone as a sentence.",
    unit: 1,
    link: getUnitUrl(1)
  },
  {
    id: "tooManyClauses",
    message: "There are too many clauses in one sentence; consider splitting it.",
    unit: 1,
    link: getUnitUrl(1)
  },

  // ========================
  // UNIT 2 – Word order
  // ========================
  {
    id: "wordOrder",
    message: "The word order in this sentence is unnatural in English.",
    unit: 2,
    link: getUnitUrl(2)
  },
  {
    id: "adverbFrequencyPosition",
    message: "Adverbs of frequency are in an unusual position here.",
    unit: 2,
    link: getUnitUrl(2)
  },
  {
    id: "timePlaceMannerOrder",
    message: "Time, place, and manner information are not in the usual order.",
    unit: 2,
    link: getUnitUrl(2)
  },
  {
    id: "splittingVerbObject",
    message: "Avoid splitting the verb and its object with extra information.",
    unit: 2,
    link: getUnitUrl(2)
  },
  {
    id: "questionWordOrder",
    message: "The word order in this question is incorrect.",
    unit: 2,
    link: getUnitUrl(2)
  },
  {
    id: "multipleAdverbsOrder",
    message: "The order of different adverbs (time/place/manner) is confusing.",
    unit: 2,
    link: getUnitUrl(2)
  },

  // ========================
  // UNIT 3 – Sentence types & connectors
  // ========================
  {
    id: "connectors",
    message: "You used a connector in a way that feels incorrect or unclear.",
    unit: 3,
    link: getUnitUrl(3)
  },
  {
    id: "runOnSentence",
    message: "This is a run-on sentence; two sentences are joined incorrectly.",
    unit: 3,
    link: getUnitUrl(3)
  },
  {
    id: "commaSplice",
    message: "Two sentences are joined with a comma only (comma splice).",
    unit: 3,
    link: getUnitUrl(3)
  },
  {
    id: "missingConnector",
    message: "Consider adding a connector to show the relationship between ideas.",
    unit: 3,
    link: getUnitUrl(3)
  },
  {
    id: "althoughButTogether",
    message: "Do not use ‘although’ and ‘but’ together in the same sentence.",
    unit: 3,
    link: getUnitUrl(3)
  },
  {
    id: "howeverWithCommaOnly",
    message: "‘However’ usually needs a semicolon or full stop before it.",
    unit: 3,
    link: getUnitUrl(3)
  },
  {
    id: "noSentenceVariety",
    message: "Most of your sentences have the same structure; add variety.",
    unit: 3,
    link: getUnitUrl(3)
  },

  // ========================
  // UNIT 4 – Punctuation & sentence flow
  // ========================
  {
    id: "punctuation",
    message: "Punctuation here makes the sentence hard to follow.",
    unit: 4,
    link: getUnitUrl(4)
  },
  {
    id: "missingFullStop",
    message: "You may be missing a full stop between ideas.",
    unit: 4,
    link: getUnitUrl(4)
  },
  {
    id: "extraComma",
    message: "There seems to be an unnecessary comma in this sentence.",
    unit: 4,
    link: getUnitUrl(4)
  },
  {
    id: "missingCommaIntroClause",
    message: "Introductory clauses usually need a comma after them.",
    unit: 4,
    link: getUnitUrl(4)
  },
  {
    id: "capitalLetterError",
    message: "Check your use of capital letters here.",
    unit: 4,
    link: getUnitUrl(4)
  },
  {
    id: "listPunctuation",
    message: "The punctuation in this list is inconsistent.",
    unit: 4,
    link: getUnitUrl(4)
  },

  // ========================
  // UNIT 5 – Paragraph basics / flow (assuming)
  // ========================
  {
    id: "sentenceTooLong",
    message: "This sentence is very long; consider dividing it for clarity.",
    unit: 5,
    link: getUnitUrl(5)
  },
  {
    id: "sentenceTooShortSeries",
    message: "You use many very short sentences; try combining some ideas.",
    unit: 5,
    link: getUnitUrl(5)
  },
  {
    id: "weakTopicSentence",
    message: "The paragraph could use a clearer topic sentence.",
    unit: 5,
    link: getUnitUrl(5)
  },
  {
    id: "offTopicSentence",
    message: "This sentence does not clearly relate to the paragraph’s main idea.",
    unit: 5,
    link: getUnitUrl(5)
  },
  {
    id: "poorParagraphBreaks",
    message: "Consider where you start new paragraphs to show idea changes.",
    unit: 5,
    link: getUnitUrl(5)
  },

  // ========================
  // UNIT 6 – Essay task basics (B2)
  // ========================
  {
    id: "missingOpinion",
    message: "Your own opinion is not clearly stated in the essay.",
    unit: 6,
    link: getUnitUrl(6)
  },
  {
    id: "ignoringTaskNotes",
    message: "You did not fully cover all parts/notes of the task.",
    unit: 6,
    link: getUnitUrl(6)
  },
  {
    id: "wrongTextType",
    message: "The tone/structure does not match the required text type (essay).",
    unit: 6,
    link: getUnitUrl(6)
  },

  // ========================
  // UNIT 7 – Analysing the question / planning
  // ========================
  {
    id: "offTaskContent",
    message: "Some content does not directly answer the exam question.",
    unit: 7,
    link: getUnitUrl(7)
  },
  {
    id: "unbalancedArguments",
    message: "The essay gives much more space to one side than the other.",
    unit: 7,
    link: getUnitUrl(7)
  },
  {
    id: "noClearPlan",
    message: "The ideas seem unordered; planning could help structure them.",
    unit: 7,
    link: getUnitUrl(7)
  },

  // ========================
  // UNIT 8 – B2 paragraphs & PEEL
  // ========================
  {
    id: "missingExample",
    message: "Your point would be stronger with a short, concrete example.",
    unit: 8,
    link: getUnitUrl(8)
  },
  {
    id: "noExplanationAfterPoint",
    message: "After a point, add explanation to show why it matters.",
    unit: 8,
    link: getUnitUrl(8)
  },
  {
    id: "weakLinkSentence",
    message: "Linking sentences between paragraphs could be clearer.",
    unit: 8,
    link: getUnitUrl(8)
  },

  // ========================
  // UNIT 9 – Introductions & conclusions
  // ========================
  {
    id: "weakIntroduction",
    message: "Your introduction does not clearly introduce the topic and task.",
    unit: 9,
    link: getUnitUrl(9)
  },
  {
    id: "weakConclusion",
    message: "The conclusion could summarise your main ideas more clearly.",
    unit: 9,
    link: getUnitUrl(9)
  },
  {
    id: "newIdeaInConclusion",
    message: "Avoid introducing completely new ideas in the conclusion.",
    unit: 9,
    link: getUnitUrl(9)
  },

  // ========================
  // UNIT 10 – Linking & cohesion (essay level)
  // ========================
  {
    id: "overusingConnectors",
    message: "There are too many explicit connectors; the writing feels heavy.",
    unit: 10,
    link: getUnitUrl(10)
  },
  {
    id: "repeatingSameConnector",
    message: "You repeat the same linking word; try some variety.",
    unit: 10,
    link: getUnitUrl(10)
  },
  {
    id: "poorCohesion",
    message: "Connections between sentences and ideas are not very clear.",
    unit: 10,
    link: getUnitUrl(10)
  },

  // ========================
  // UNIT 11 – Editing for accuracy
  // ========================
  {
    id: "articleError",
    message: "Check your use of a/an/the in this phrase.",
    unit: 11,
    link: getUnitUrl(11)
  },
  {
    id: "uncountablePlural",
    message: "Be careful: some uncountable nouns do not take a plural form.",
    unit: 11,
    link: getUnitUrl(11)
  },
  {
    id: "ifClauseForm",
    message: "The structure of this conditional sentence is not quite right.",
    unit: 11,
    link: getUnitUrl(11)
  },
  {
    id: "relativePronounError",
    message: "Check whether ‘who/which/that’ is used correctly here.",
    unit: 11,
    link: getUnitUrl(11)
  },
  {
    id: "spellingCommonWord",
    message: "There may be a spelling mistake in a common academic word.",
    unit: 11,
    link: getUnitUrl(11)
  },

  // ========================
  // UNIT 12 – Confidence & time management
  // ========================
  {
    id: "underLength",
    message: "Your answer seems quite short; aim for the full recommended length.",
    unit: 12,
    link: getUnitUrl(12)
  },
  {
    id: "overLength",
    message: "Your answer is very long; this may cause timing problems in the exam.",
    unit: 12,
    link: getUnitUrl(12)
  },
  {
    id: "panicEditing",
    message: "The final paragraph feels rushed; leave a few minutes for calm editing.",
    unit: 12,
    link: getUnitUrl(12)
  },

  // ========================
  // UNIT 13 – Planning B2 essays
  // ========================
  {
    id: "noClearParagraphPlan",
    message: "Paragraphs do not follow a clear overall plan.",
    unit: 13,
    link: getUnitUrl(13)
  },
  {
    id: "ideaRepetition",
    message: "You repeat the same idea instead of developing it.",
    unit: 13,
    link: getUnitUrl(13)
  },

  // ========================
  // UNIT 14 – Planning C1 essays
  // ========================
  {
    id: "unbalancedDiscussion",
    message: "The two sides of the discussion are not presented in a balanced way.",
    unit: 14,
    link: getUnitUrl(14)
  },
  {
    id: "noEvaluation",
    message: "At C1, examiners look for evaluation, not just description.",
    unit: 14,
    link: getUnitUrl(14)
  },

  // ========================
  // UNIT 15 – C1 paragraphs & depth
  // ========================
  {
    id: "shallowParagraph",
    message: "This paragraph could go deeper: add explanation or evaluation.",
    unit: 15,
    link: getUnitUrl(15)
  },
  {
    id: "missingBalanceInParagraph",
    message: "C1 paragraphs often acknowledge other perspectives briefly.",
    unit: 15,
    link: getUnitUrl(15)
  },

  // ========================
  // UNIT 16 – Style, tone, formality
  // ========================
  {
    id: "tooInformal",
    message: "Some expressions are too informal for a Cambridge essay.",
    unit: 16,
    link: getUnitUrl(16)
  },
  {
    id: "contractionsInFormalWriting",
    message: "Avoid contractions (don’t, it’s, can’t) in formal writing.",
    unit: 16,
    link: getUnitUrl(16)
  },
  {
    id: "overFormal",
    message: "Some phrases sound overly formal or unnatural.",
    unit: 16,
    link: getUnitUrl(16)
  },
  {
    id: "emotionalLanguage",
    message: "Try to sound calm and objective rather than emotional.",
    unit: 16,
    link: getUnitUrl(16)
  },
  {
    id: "inconsistentTone",
    message: "The tone shifts between informal and formal.",
    unit: 16,
    link: getUnitUrl(16)
  },

  // ========================
  // UNIT 17 – Editing for style & precision
  // ========================
  {
    id: "veryPlusAdjective",
    message: "Replace ‘very + adjective’ with a stronger, single-word alternative.",
    unit: 17,
    link: getUnitUrl(17)
  },
  {
    id: "vagueVocabulary",
    message: "Words like ‘things’ or ‘stuff’ are vague; choose something more precise.",
    unit: 17,
    link: getUnitUrl(17)
  },
  {
    id: "redundantPhrases",
    message: "There are redundant words here that you can safely remove.",
    unit: 17,
    link: getUnitUrl(17)
  },
  {
    id: "paddingExpressions",
    message: "Phrases like ‘due to the fact that’ can usually be shortened.",
    unit: 17,
    link: getUnitUrl(17)
  },
  {
    id: "repeatedWords",
    message: "You repeat the same adjective or noun; consider synonyms.",
    unit: 17,
    link: getUnitUrl(17)
  },

  // ========================
  // UNIT 18 – Personal academic voice
  // ========================
  {
    id: "tooManyITthink",
    message: "You use ‘I think’ / ‘I believe’ very often; show your view more indirectly.",
    unit: 18,
    link: getUnitUrl(18)
  },
  {
    id: "noAcademicVoice",
    message: "The essay feels like spoken language rather than academic writing.",
    unit: 18,
    link: getUnitUrl(18)
  },
  {
    id: "overTemplateLanguage",
    message: "Some phrases feel memorised; try to sound more personal and natural.",
    unit: 18,
    link: getUnitUrl(18)
  },

  // ========================
  // UNIT 19 – C2 essay task
  // ========================
  {
    id: "weakTextSummary",
    message: "Your summary of the source texts is either too long or too short.",
    unit: 19,
    link: getUnitUrl(19)
  },
  {
    id: "noSynthesis",
    message: "You describe each text separately but do not clearly connect them.",
    unit: 19,
    link: getUnitUrl(19)
  },
  {
    id: "littleEvaluation",
    message: "C2 essays should evaluate the ideas, not just repeat them.",
    unit: 19,
    link: getUnitUrl(19)
  },

  // ========================
  // UNIT 20 – Refining C2 style (elegance, nuance)
  // ========================
  {
    id: "heavyStyle",
    message: "The style feels heavy; try shorter, clearer sentences for elegance.",
    unit: 20,
    link: getUnitUrl(20)
  },
  {
    id: "lackOfNuance",
    message: "Statements here sound absolute; add nuance with cautious language.",
    unit: 20,
    link: getUnitUrl(20)
  },
  {
    id: "awkwardMetaphor",
    message: "A metaphor or image here feels overdone or unclear.",
    unit: 20,
    link: getUnitUrl(20)
  },
  {
    id: "rhythmIssues",
    message: "The rhythm of this paragraph is uneven; vary sentence length.",
    unit: 20,
    link: getUnitUrl(20)
  }
];
