import { z } from "zod";

export const LevelEnum = z.enum(["B2", "C1", "C2"]);
export const TaskTypeEnum = z.enum(["essay", "letter", "report", "review", "proposal"]);

export const correctionRequestSchema = z.object({
  level: LevelEnum,
  taskType: TaskTypeEnum,
  taskPrompt: z.string().default(""),
  studentText: z.string().min(1, "studentText is required"),
  targetWordCount: z.number().int().positive().optional(),
  language: z.string().default("en"),
  options: z
    .object({
      strictCambridge: z.boolean().optional(),
      minChangeEdits: z.boolean().optional(),
      highlightPunctuationJoins: z.boolean().optional(),
      returnInlineDiff: z.boolean().optional()
    })
    .optional(),
  client: z
    .object({
      appVersion: z.string().optional(),
      dev: z.boolean().optional()
    })
    .optional()
});

export type CorrectionRequest = z.infer<typeof correctionRequestSchema>;

// Response types (loose for now; tighten later)
export type CorrectionResponse = {
  meta: { level: string; taskType: string; processingMs: number; model: string; version: string };
  counts: { words: number; sentences: number; paragraphs: number };
  wordCountCheck: { min: number; max: number; status: "ok" | "low" | "high" };
  scores: {
    content: { band: number; explanation: string };
    communicativeAchievement: { band: number; explanation: string };
    organisation: { band: number; explanation: string };
    language: { band: number; explanation: string };
  };
  overall: { band: number; label: string };
  edits: Array<{
    span: { start: number; end: number; text: string };
    type: string;
    suggestion: string;
    explanation: string;
  }>;
  inlineDiff: string;
  cohesion: { linkers: string[]; gaps?: string[] };
  register: { issues: string[]; tone: string };
  nextDraft: { priorities: string[]; modelRewrite?: string };
};
