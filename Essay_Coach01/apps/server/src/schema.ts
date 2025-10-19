// apps/server/src/schema.ts
import { z } from "zod";

export const LevelEnum = z.enum(["B2", "C1", "C2"]);
export const TaskTypeEnum = z.enum(["essay", "letter", "report", "review", "proposal"]);

/** ---------- REQUEST ---------- */
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

/** ---------- RESPONSE ---------- */
const scoreBlock = z.object({
  band: z.number().int(),
  explanation: z.string()
});

export const correctionResponseSchema = z.object({
  meta: z.object({
    level: LevelEnum,
    taskType: TaskTypeEnum,
    processingMs: z.number().int(),
    model: z.string(),
    version: z.string()
  }),
  counts: z.object({
    words: z.number().int(),
    sentences: z.number().int(),
    paragraphs: z.number().int()
  }),
  wordCountCheck: z.object({
    min: z.number().int(),
    max: z.number().int(),
    status: z.enum(["ok", "low", "high"])
  }),
  scores: z.object({
    content: scoreBlock,
    communicativeAchievement: scoreBlock,
    organisation: scoreBlock,
    language: scoreBlock
  }),
  overall: z.object({
    band: z.number().int(),
    label: z.string()
  }),
  edits: z.array(
    z.object({
      span: z.object({
        start: z.number().int(),
        end: z.number().int(),
        text: z.string()
      }),
      type: z.string(),
      suggestion: z.string(),
      explanation: z.string()
    })
  ),
  inlineDiff: z.string(),
  cohesion: z.object({
    linkers: z.array(z.string()),
    gaps: z.array(z.string()).optional()
  }),
  register: z.object({
    issues: z.array(z.string()),
    tone: z.string()
  }),
  nextDraft: z.object({
    priorities: z.array(z.string()),
    modelRewrite: z.string().optional()
  })
});

export type CorrectionRequest = z.infer<typeof correctionRequestSchema>;
export type CorrectionResponse = z.infer<typeof correctionResponseSchema>;
