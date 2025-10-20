import type { CorrectionRequest, CorrectionResponse } from "./schema";
import { mockCorrect } from "./mock";

/**
 * Swap the mock for a real LLM when you're ready:
 * - Build prompt from req
 * - Call provider
 * - Validate JSON against a strict schema
 * - Fallback to mock on failure
 */
export async function runPipeline(req: CorrectionRequest): Promise<CorrectionResponse> {
  // Placeholder: you can add pre-checks here (language detect, length limits, etc.)
  const start = Date.now();
  const out = mockCorrect(req);
  out.meta.processingMs = Date.now() - start;
  return out;
}