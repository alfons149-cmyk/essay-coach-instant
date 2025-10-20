import { correctionRequestSchema, correctionResponseSchema } from "./schema.ts";
import { zodToJsonSchema } from "zod-to-json-schema";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
const outDir = resolve("./dist-schema");
mkdirSync(outDir, { recursive: true });

writeFileSync(resolve(outDir, "correct.request.schema.json"),
  JSON.stringify(zodToJsonSchema(correctionRequestSchema, "CorrectionRequest"), null, 2));
writeFileSync(resolve(outDir, "correct.response.schema.json"),
  JSON.stringify(zodToJsonSchema(correctionResponseSchema, "CorrectionResponse"), null, 2));

console.log("Schemas written to", outDir);