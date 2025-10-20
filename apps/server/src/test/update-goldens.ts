import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runPipeline } from "../pipeline";
import type { CorrectionRequest } from "../schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths (from apps/server/src/test/)
const repoRoot      = resolve(__dirname, "../../../..");
const fixturesDir   = resolve(repoRoot, "tests/fixtures");
const goldenDir     = resolve(repoRoot, "tests/golden");

// Which fixtures to process
const cases = ["b2_essay", "c1_essay", "c2_essay"];

function normalize(o: any) {
  // Remove / clamp volatile fields so diffs are stable
  if (o?.meta) {
    o.meta.processingMs = 0;
    o.meta.model = String(o.meta.model || "").replace(/:.*/, ":normalized");
    o.meta.version = String(o.meta.version || "").replace(/-.*/, "-normalized");
  }
  // You could also round counts if needed:
  // if (o?.counts) o.counts.sentences = Math.max(1, o.counts.sentences);
  return o;
}

async function main() {
  mkdirSync(goldenDir, { recursive: true });

  for (const name of cases) {
    const reqPath = resolve(fixturesDir, `${name}.json`);
    const outPath = resolve(goldenDir, `${name}.response.json`);

    const req = JSON.parse(readFileSync(reqPath, "utf8")) as CorrectionRequest;
    const res = await runPipeline(req);
    const norm = normalize(res);

    writeFileSync(outPath, JSON.stringify(norm, null, 2) + "\n", "utf8");
    console.log("Wrote", outPath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
