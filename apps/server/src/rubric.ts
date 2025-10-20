import { LevelEnum } from "./schema";

export type WordWindow = { min: number; max: number; label: string };

export function targetFor(level: typeof LevelEnum._type): WordWindow {
  switch (level) {
    case "B2": return { min: 140, max: 190, label: "B2: 140–190" };
    case "C1": return { min: 220, max: 260, label: "C1: 220–260" };
    case "C2": return { min: 240, max: 280, label: "C2: 240–280" };
    default:   return { min: 220, max: 260, label: "C1: 220–260" };
  }
}

export const weights = {
  B2: { content: 30, communicative: 25, organisation: 20, language: 25 },
  C1: { content: 25, communicative: 25, organisation: 20, language: 30 },
  C2: { content: 20, communicative: 25, organisation: 20, language: 35 }
} as const;

