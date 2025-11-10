// apps/worker/src/index.ts

type Json = Record<string, unknown>;

const ALLOWED_ORIGINS = [
  "https://alfons149-cmyk.github.io",
  "https://alfons149-cmyk.github.io/essay-coach-instant",
  "https://alfons149-cmyk.github.io/essay-coach-instant/",
  // add your custom domains later here
];

const CORS_HEADERS = (origin: string) => ({
  "access-control-allow-origin": origin,
  "access-control-allow-headers":
    "content-type, authorization, x-requested-with, x-api-key",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-max-age": "86400",
});

function chooseCorsOrigin(req: Request): string {
  const origin = req.headers.get("origin") || "";
  // allow github pages (with or without trailing slash) & same-origin dev
  if (!origin) return "*";
  const ok = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
  return ok ? origin : "*";
}

function json(data: Json, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function text(body: string, init?: ResponseInit): Response {
  return new Response(body, init);
}

// --- tiny in-memory “corrector” mock (works without API keys) ---
function mockCorrect(textIn: string, level: string) {
  const trimmed = (textIn || "").trim();
  const levelUp = (level || "B2").toUpperCase();

  // very small demo transformation: remove weak intensifiers at B2,
  // replace with stronger adjectives at C1/C2 (purely illustrative)
  let out = trimmed
    .replace(/\breally\b/gi, "")
    .replace(/\bvery\b/gi, "")
    .replace(/\bactually\b/gi, "");

  if (levelUp === "C1" || levelUp === "C2") {
    out = out
      .replace(/\bgood\b/gi, "excellent")
      .replace(/\bbad\b/gi, "detrimental")
      .replace(/\breally good\b/gi, "superb");
  }

  const notes = [
    `Level detected/requested: ${levelUp}`,
    "Removed weak intensifiers (really/very/actually).",
    levelUp === "C1" || levelUp === "C2"
      ? "Upgraded some adjectives (good→excellent, bad→detrimental)."
      : "Kept vocabulary at B2 range.",
  ];

  return { output: out, notes };
}

async function handleHealth(request: Request) {
  const origin = chooseCorsOrigin(request);
  return json(
    { ok: true, ts: Date.now(), region: (request as any).cf?.colo || "edge" },
    { headers: CORS_HEADERS(origin) }
  );
}

async function handleCorrect(request: Request) {
  const origin = chooseCorsOrigin(request);

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS(origin) });
  }

  if (request.method !== "POST") {
    return json(
      { error: "Method not allowed. Use POST with JSON." },
      { status: 405, headers: CORS_HEADERS(origin) }
    );
  }

  const ct = request.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return json(
      { error: 'Expected "application/json" body.' },
      { status: 400, headers: CORS_HEADERS(origin) }
    );
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return json(
      { error: "Invalid JSON body." },
      { status: 400, headers: CORS_HEADERS(origin) }
    );
  }

  const textIn = String(body.text || "");
  const level = String(body.level || "B2");
  if (!textIn.trim()) {
    return json(
      { error: 'Missing "text".' },
      { status: 400, headers: CORS_HEADERS(origin) }
    );
  }

  // 128k char guard (prevent abuse / giant payloads)
  if (textIn.length > 128_000) {
    return json(
      { error: "Text too long (128k char limit)." },
      { status: 413, headers: CORS_HEADERS(origin) }
    );
  }

  const result = mockCorrect(textIn, level);

  return json(
    {
      ok: true,
      input_words: textIn.trim().split(/\s+/).length,
      output_words: result.output.trim() ? result.output.trim().split(/\s+/).length : 0,
      result,
    },
    { headers: CORS_HEADERS(origin) }
  );
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const origin = chooseCorsOrigin(request);

    // Global preflight (so OPTIONS on any /api/* works)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS(origin) });
    }

    // Routes
    if (url.pathname === "/api/health" || url.pathname === "/ping") {
      return handleHealth(request);
    }
    if (url.pathname === "/api/correct") {
      return handleCorrect(request);
    }

    return text("Not Found", { status: 404, headers: CORS_HEADERS(origin) });
  },
};
