// js/cambridge_rubric.js
// Minimal Cambridge-style rubric used by scoring.js

window.CAMBRIDGE_RUBRIC = {
  B2: {
    Content: {
      low: {
        score_range: '140–159',
        descriptor: 'Some parts of the task are missing or only partly addressed.',
        improvements: [
          'Answer all parts of the task, not just one or two.',
          'Add specific examples to support your main ideas.'
        ]
      },
      mid: {
        score_range: '160–175',
        descriptor: 'Task is generally covered with relevant ideas.',
        improvements: [
          'Make your main opinion clearer in the introduction and conclusion.',
          'Develop each main point with one extra detail or example.'
        ]
      },
      high: {
        score_range: '176–190',
        descriptor: 'Task is fully covered with clear, well-chosen ideas.',
        improvements: [
          'Refine topic sentences so the reader always knows your focus.',
          'Use more precise examples that directly support your argument.'
        ]
      }
    },
    Communicative_Achievement: {
      low: {
        score_range: '140–159',
        descriptor: 'The text does not always read like a suitable exam answer.',
        improvements: [
          'Use a more consistent formal tone; avoid chatty expressions.',
          'Make sure your purpose (to discuss, evaluate, recommend) is clear.'
        ]
      },
      mid: {
        score_range: '160–175',
        descriptor: 'Generally appropriate style and tone for the task.',
        improvements: [
          'Use clear signposting language to guide the reader (for example, "Firstly", "In contrast").',
          'Check that each paragraph stays focused on its main function.'
        ]
      },
      high: {
        score_range: '176–190',
        descriptor: 'Style, tone and register are well controlled and appropriate.',
        improvements: [
          'Vary sentence rhythm to keep the text engaging but still formal.',
          'Use a slightly more confident, exam-like voice in conclusions.'
        ]
      }
    },
    Organisation: {
      low: {
        score_range: '140–159',
        descriptor: 'Organisation is weak; ideas may feel disconnected.',
        improvements: [
          'Group related ideas into clear paragraphs.',
          'Add linking phrases between sentences and paragraphs.'
        ]
      },
      mid: {
        score_range: '160–175',
        descriptor: 'Logical organisation with mostly clear paragraphs.',
        improvements: [
          'Improve paragraph openings and endings to show connections.',
          'Avoid very long paragraphs; break them when you change focus.'
        ]
      },
      high: {
        score_range: '176–190',
        descriptor: 'Well-structured text with logical progression.',
        improvements: [
          'Use subtle connectors instead of repeating the same ones.',
          'Polish the final paragraph so it feels conclusive but not repetitive.'
        ]
      }
    },
    Language: {
      low: {
        score_range: '140–159',
        descriptor: 'Frequent errors may cause strain; limited range.',
        improvements: [
          'Check subject–verb agreement and basic tense consistency.',
          'Replace very simple words with slightly more precise alternatives.'
        ]
      },
      mid: {
        score_range: '160–175',
        descriptor: 'Generally accurate language with some variety.',
        improvements: [
          'Reduce repetition by using synonyms and referencing words.',
          'Pay attention to clause punctuation and longer sentences.'
        ]
      },
      high: {
        score_range: '176–190',
        descriptor: 'Good range with mostly accurate, appropriate language.',
        improvements: [
          'Experiment with more advanced structures, but keep them controlled.',
          'Aim for more precise collocations typical of academic English.'
        ]
      }
    }
  },

  C1: {
    Content: {
      low: {
        score_range: '160–179',
        descriptor: 'Ideas may be underdeveloped or not fully relevant.',
        improvements: [
          'Tighten your argument; remove points that do not support your main line.',
          'Add one or two more sophisticated, nuanced ideas.'
        ]
      },
      mid: {
        score_range: '180–192',
        descriptor: 'Relevant, developed ideas with some nuance.',
        improvements: [
          'Make your stance slightly more explicit throughout the essay.',
          'Support key claims with more specific or data-like examples.'
        ]
      },
      high: {
        score_range: '193–200',
        descriptor: 'Mature, well-developed ideas, clearly organised.',
        improvements: [
          'Add brief acknowledgement of alternative views to show sophistication.',
          'Use more concise topic sentences that still show your angle.'
        ]
      }
    },
    Communicative_Achievement: {
      low: {
        score_range: '160–179',
        descriptor: 'Purpose and tone are not always consistent.',
        improvements: [
          'Avoid conversational fillers and vague language.',
          'Adjust register so it matches a serious exam context.'
        ]
      },
      mid: {
        score_range: '180–192',
        descriptor: 'Style is generally appropriate and effective.',
        improvements: [
          'Strengthen the authorial voice; sound slightly more authoritative.',
          'Use more precise hedging (for example, "tend to", "it is likely that").'
        ]
      },
      high: {
        score_range: '193–200',
        descriptor: 'Highly appropriate style, clear voice and purpose.',
        improvements: [
          'Polish transitions so they feel natural, not formulaic.',
          'Balance objectivity with a clear, confident viewpoint.'
        ]
      }
    },
    Organisation: {
      low: {
        score_range: '160–179',
        descriptor: 'The structure is not always clear or balanced.',
        improvements: [
          'Rebuild your outline: introduction, 2–3 body paragraphs, conclusion.',
          'Check that each paragraph has one clear central idea.'
        ]
      },
      mid: {
        score_range: '180–192',
        descriptor: 'Logical organisation with mostly smooth progression.',
        improvements: [
          'Use more precise linking phrases between complex ideas.',
          'Control paragraph length; avoid large blocks of text.'
        ]
      },
      high: {
        score_range: '193–200',
        descriptor: 'Elegant and coherent structure.',
        improvements: [
          'Experiment with more subtle paragraph transitions (lexical cohesion).',
          'Use referencing ("this approach", "such measures") to join ideas.'
        ]
      }
    },
    Language: {
      low: {
        score_range: '160–179',
        descriptor: 'Noticeable errors and limited range for C1.',
        improvements: [
          'Review common C1 grammar (inversions, participle clauses, conditionals).',
          'Reduce basic mistakes: articles, prepositions, word order.'
        ]
      },
      mid: {
        score_range: '180–192',
        descriptor: 'Good control with some high-level structures.',
        improvements: [
          'Upgrade frequent simple words with more precise academic choices.',
          'Work on collocations and fixed expressions typical of essays.'
        ]
      },
      high: {
        score_range: '193–200',
        descriptor: 'Wide range of accurate, sophisticated language.',
        improvements: [
          'Polish word choice to remove minor awkward phrases.',
          'Vary clause patterns to keep the rhythm natural and engaging.'
        ]
      }
    }
  },

  C2: {
    Content: {
      low: {
        score_range: '180–199',
        descriptor: 'Ideas may be clear but not yet fully C2 in depth or range.',
        improvements: [
          'Add more subtle, layered arguments and perspectives.',
          'Bring in implications, limitations or wider context briefly.'
        ]
      },
      mid: {
        score_range: '200–211',
        descriptor: 'Thoughtful ideas with emerging sophistication.',
        improvements: [
          'Tighten your logic so each point clearly builds your thesis.',
          'Use more precise, discipline-appropriate examples or scenarios.'
        ]
      },
      high: {
        score_range: '212–230',
        descriptor: 'Highly sophisticated, well-developed content.',
        improvements: [
          'Aim for even more concision without losing nuance.',
          'Check that every paragraph contributes clearly to your main line.'
        ]
      }
    },
    Communicative_Achievement: {
      low: {
        score_range: '180–199',
        descriptor: 'Tone or genre may slip below C2 expectations.',
        improvements: [
          'Remove informal traces and overly direct address.',
          'Align your style more closely with serious academic commentary.'
        ]
      },
      mid: {
        score_range: '200–211',
        descriptor: 'Generally appropriate high-level style.',
        improvements: [
          'Use more precise stance markers (“arguably”, “it can be maintained that”).',
          'Balance personal voice with academic distance.'
        ]
      },
      high: {
        score_range: '212–230',
        descriptor: 'Very effective, natural academic voice.',
        improvements: [
          'Polish any remaining formulaic phrases.',
          'Use subtle rhetorical questions or parallelism to add finesse.'
        ]
      }
    },
    Organisation: {
      low: {
        score_range: '180–199',
        descriptor: 'Organisation may feel slightly loose for C2.',
        improvements: [
          'Clarify the logical structure in your introduction.',
          'Use signposting to signal shifts in argument or perspective.'
        ]
      },
      mid: {
        score_range: '200–211',
        descriptor: 'Clear, controlled organisation.',
        improvements: [
          'Experiment with more elegant transitions between sections.',
          'Use framing: echo key ideas from the introduction in the conclusion.'
        ]
      },
      high: {
        score_range: '212–230',
        descriptor: 'Very coherent and sophisticated structure.',
        improvements: [
          'Check for any paragraphs that could be merged or refined.',
          'Fine-tune the order of ideas for maximum impact.'
        ]
      }
    },
    Language: {
      low: {
        score_range: '180–199',
        descriptor: 'Good but not consistently C2-level control.',
        improvements: [
          'Eliminate occasional basic slips: agreement, articles, simple tenses.',
          'Reduce dependence on a few favourite patterns or words.'
        ]
      },
      mid: {
        score_range: '200–211',
        descriptor: 'Strong, flexible language use.',
        improvements: [
          'Strengthen idiomatic but formal collocations.',
          'Polish clause rhythm; avoid overlong, heavy sentences.'
        ]
      },
      high: {
        score_range: '212–230',
        descriptor: 'Exceptionally accurate, flexible language.',
        improvements: [
          'Look for tiny improvements in word choice and nuance.',
          'Ensure that even very complex sentences remain effortless to read.'
        ]
      }
    }
  }
};
