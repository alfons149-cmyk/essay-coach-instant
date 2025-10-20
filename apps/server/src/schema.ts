import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { correctionRequestSchema, correctionResponseSchema } from "./schema";

const outDir = resolve("./dist-schema");
mkdirSync(outDir, { recursive: true });

writeFileSync(
  resolve(outDir, "correct.request.schema.json"),
  JSON.stringify(zodToJsonSchema(correctionRequestSchema, "CorrectionRequest"), null, 2)
);

writeFileSync(
  resolve(outDir, "correct.response.schema.json"),
  JSON.stringify(zodToJsonSchema(correctionResponseSchema, "CorrectionResponse"), null, 2)
);

console.log("Schemas written to", outDir);
