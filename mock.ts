import type { CorrectionRequest, CorrectionResponse } from "./schema";
import { targetFor } from "./rubric";

function wc(s: string): number {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

export function mockCorrect(req: CorrectionRequest): CorrectionResponse {
  const words = wc(req.studentText);
  const target = targetFor(req.level);
  const status = words < target.min ? "low" : words > target.max ? "high" : "ok";

  // Simple deterministic seed
  const seed = (words + req.level.charCodeAt(0)) % 5;
  const bandBase = { B2: 2, C1: 3, C2: 3 }[req.level];

  const edits = [
    mkEdit(req.studentText, "very big", "significant", "More formal and concise for exam register."),
    mkEdit(req.studentText, "a lot of", "considerable", "Avoid informal quantifiers at this level."),
    { span: { start: 0, end: 1, text: "," }, type: "punctuation_join", suggestion: ";", explanation: "Avoid comma splice; use a semicolon or linker." }
  ];

  return {
    meta: { level: req.level, taskType: req.taskType, processingMs: 8, model: "mock:v1", version: "ec-mock-v1" },
    counts: { words, sentences: Math.max(1, Math.floor(words / 15)), paragraphs: Math.max(1, Math.floor(words / 90)) },
    wordCountCheck: { min: target.min, max: target.max, status },
    scores: {
      content: { band: bandBase + (seed > 2 ? 1 : 0), explanation: "Addresses task reasonably well." },
      communicativeAchievement: { band: bandBase, explanation: "Register mostly appropriate." },
      organisation: { band: bandBase - 1 + (seed > 1 ? 1 : 0), explanation: "Generally coherent; some weak topic sentences." },
      language: { band: bandBase - 1 + (seed > 3 ? 1 : 0), explanation: "Occasional awkward collocations and joins." }
    },
    overall: { band: bandBase, label: `${bandBase >= 3 ? "Borderline pass" : "Needs work"} ${req.level}` },
    edits,
    inlineDiff: "",
    cohesion: { linkers: ["Firstly", "Moreover", "However"], gaps: status !== "ok" ? ["Word count outside target window"] : [] },
    register: { issues: seed % 2 ? ["colloquial phrase detected"] : [], tone: "mostly formal" },
    nextDraft: { priorities: ["Tighten thesis in P1", "Vary sentence openings", "Fix comma splices (2)"] }
  };
}

function mkEdit(full: string, needle: string, suggestion: string, explanation: string) {
  const idx = Math.max(0, Math.min(full.length - 1, Math.floor((full.length + needle.length) * 0.3)));
  return { span: { start: idx, end: idx + needle.length, text: needle }, type: "lexis", suggestion, explanation };
}