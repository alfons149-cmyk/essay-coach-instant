import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runPipeline } from "../pipeline";
import type { CorrectionRequest } from "../schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const repoRoot    = resolve(__dirname, "../../../..");
const fixturesDir = resolve(repoRoot, "tests/fixtures");
const goldenDir   = resolve(repoRoot, "tests/golden");

const cases = ["b2_essay", "c1_essay", "c2_essay"];

function normalize(o: any) {
  if (o?.meta) {
    o.meta.processingMs = 0;
    o.meta.model = String(o.meta.model || "").replace(/:.*/, ":normalized");
    o.meta.version = String(o.meta.version || "").replace(/-.*/, "-normalized");
  }
  return o;
}

function diffJSON(a: any, b: any) {
  const sa = JSON.stringify(a, null, 2);
  const sb = JSON.stringify(b, null, 2);
  if (sa === sb) return null;
  // Tiny diff (line-by-line) for console readability
  const la = sa.split("\n");
  const lb = sb.split("\n");
  const out: string[] = [];
  const max = Math.max(la.length, lb.length);
  for (let i = 0; i < max; i++) {
    if (la[i] !== lb[i]) out.push(`- ${la[i] ?? ""}\n+ ${lb[i] ?? ""}`);
  }
  return out.join("\n");
}

async function main() {
  let failures = 0;

  for (const name of cases) {
    const req = JSON.parse(readFileSync(resolve(fixturesDir, `${name}.json`), "utf8")) as CorrectionRequest;
    const got = normalize(await runPipeline(req));
    const exp = JSON.parse(readFileSync(resolve(goldenDir, `${name}.response.json`), "utf8"));

    const d = diffJSON(exp, got);
    if (d) {
      console.error(`✗ Mismatch for ${name}:\n${d}\n`);
      failures++;
    } else {
      console.log(`✓ ${name} matches golden`);
    }
  }

  if (failures) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
