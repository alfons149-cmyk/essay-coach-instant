// worker.js — EssayCoach Worker (Alfons edition, rich teacher feedback + vocabulary + sentence insights)

const ALLOWED_ORIGINS = new Set([
  "https://alfons149-cmyk.github.io", // your GitHub Pages
  "http://localhost:5173"             // local dev
]);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };
}

function json(obj, status = 200, origin = "") {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    // --- Preflight ---
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // --- Health check ---
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true, originMatched: ALLOWED_ORIGINS.has(origin) }, 200, origin);
    }

    // --- /api/correct endpoint ---
    if (request.method === "POST" && url.pathname === "/api/correct") {
      try {
        let payload;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Invalid JSON body." }, 400, origin);
        }

        const { essay, task = "", level = "C1", formal = true, style = "" } = payload || {};
        if (!essay || typeof essay !== "string") {
          return json({ error: "Missing 'essay' (string)." }, 400, origin);
        }

        const OPENAI_API_KEY = env.OPENAI_API_KEY;
        if (!OPENAI_API_KEY) {
          return json({ error: "OPENAI_API_KEY not set" }, 500, origin);
        }

        const MODEL = env.OPENAI_MODEL || "gpt-4o-mini";

        // --- Alfons-style system prompt with vocabularySuggestions + sentenceInsights ---
        const systemPrompt = `
You are EssayCoach, a Cambridge English writing teacher and mentor, based on Alfons' teaching style and course book.

You MUST return STRICT JSON with EXACT keys:

{
  "feedback": "string",
  "edits": [
    { "from": "string", "to": "string", "reason": "string" }
  ],
  "nextDraft": "string",
  "vocabularySuggestions": {
    "string": ["string","string","string (optional)"]
  },
  "sentenceInsights": [
    {
      "example": "string",
      "issue": "string",
      "explanation": "string",
      "betterVersion": "string",
      "linkHint": "string"
    }
  ]
}

DETAILED RULES:

1) feedback
- 80–150 words.
- Warm, honest, emotionally intelligent. Sound like a caring teacher (Alfons).
- Mix short and longer reflective sentences.
- 1–2 concrete priorities: what to work on next.
- You MAY mention the level (B2/C1/C2) but avoid technical jargon.

2) edits
- Array of small, focused edits.
- "from": short extract from the student’s text (word or short phrase).
- "to": improved version.
- "reason": short label, e.g. "grammar", "clarity", "register", "cohesion".
- 5–15 entries is enough; do NOT try to fix everything here.

3) nextDraft
- Fully corrected essay in British English.
- Maintain the student’s meaning and structure where possible.
- Improve grammar, punctuation, connectors, and register to match the level.
- Follow Cambridge-style expectations for essays: clear paragraphs, logical progression, appropriate linking words.

Intensifiers:
- If level is B2: remove very / really / a lot where possible or change to neutral forms.
- If level is C1 or C2: replace vague intensifiers with precise, formal alternatives:
  - "very important" → "crucial" / "paramount"
  - "really bad" → "seriously damaging" / "detrimental"
  - "a lot of" → "many" / "numerous"

4) vocabularySuggestions
- Object where each key is a word/phrase from the essay that could be improved.
- Value is an array of 1–3 alternative expressions that are more precise, formal, or varied.
- Good examples:
  - "a lot of": ["many", "numerous", "a substantial number of"]
  - "very important": ["crucial", "fundamental", "paramount"]
  - "good": ["effective", "beneficial", "advantageous"]

5) sentenceInsights  (BOOK-AWARE coaching)
- Choose 2–6 sentences from the student’s essay that are especially interesting to teach from.
- For EACH item:
  - "example": the sentence or key part of it (as written by the student).
  - "issue": a short label for what is going on:
      e.g. "Run-on sentence", "Comma splice", "Weak linker", "Mixed tenses",
           "Overloaded sentence", "Stative verb in continuous form", etc.
  - "explanation": a clear, student-friendly explanation of the problem,
    similar to how Alfons explains things in his book. Use simple, direct language.
  - "betterVersion": a corrected / improved version of the sentence.
  - "linkHint": a short reference to WHERE this is covered in the course book,
    using a label like:
      - "See Unit 2: Simple vs. complex sentences"
      - "See Chapter 3: Present Perfect vs. Past Simple"
      - "See Section 4.3: Linking words for contrast"
    Do NOT quote directly from the book. Only refer to unit/chapter/section names or numbers.

General:
- Always return VALID JSON. No comments, no trailing commas, no extra keys.
- All strings must be plain text (no markdown).
`.trim();

        const userPrompt = `
LEVEL: ${level}
FORMAL: ${formal ? "Yes" : "No"}
STYLE: ${style || "Standard academic"}
TASK: ${task || "(none)"}

Provide feedback, edits, next draft, vocabulary suggestions, and sentenceInsights for this essay:

${essay}
`.trim();

        // ---- OpenAI call ----
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + OPENAI_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            temperature: 0.5,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ]
          }),
        });

        if (!r.ok) {
          const err = await r.text().catch(() => "(no body)");
          return json({ error: "OpenAI HTTP " + r.status, details: err }, r.status, origin);
        }

        const data = await r.json();
        const raw = data && data.choices && data.choices[0] && data.choices[0].message
          ? data.choices[0].message.content || "{}"
          : "{}";

        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return json({ error: "Model did not return valid JSON", raw }, 502, origin);
        }

        const nextDraft = String(parsed.nextDraft || "").trim();
        const feedback = String(parsed.feedback || "").trim();

        const edits = Array.isArray(parsed.edits)
          ? parsed.edits.map((e) => ({
              from: String(e.from || ""),
              to: String(e.to || ""),
              reason: String(e.reason || "clarity"),
            }))
          : [];

        const vocabularySuggestions =
          parsed.vocabularySuggestions && typeof parsed.vocabularySuggestions === "object"
            ? parsed.vocabularySuggestions
            : {};

        // NEW: sentenceInsights normalisation
        const sentenceInsights = Array.isArray(parsed.sentenceInsights)
          ? parsed.sentenceInsights
              .map((si) => ({
                example: String(si.example || "").trim(),
                issue: String(si.issue || "").trim(),
                explanation: String(si.explanation || "").trim(),
                betterVersion: String(si.betterVersion || "").trim(),
                linkHint: String(si.linkHint || "").trim(),
              }))
              .filter((si) => si.example && si.explanation)
          : [];

        if (!nextDraft) {
          return json({ error: 'Missing "nextDraft" field', raw: parsed }, 502, origin);
        }

        const wcIn = (essay.trim().match(/\S+/g) || []).length;
        const wcOut = (nextDraft.trim().match(/\S+/g) || []).length;

        // ---- Return FE schema + new sentenceInsights ----
        return json(
          {
            level,
            inputWords: wcIn,
            outputWords: wcOut,
            feedback,
            edits,
            nextDraft,
            vocabularySuggestions,
            sentenceInsights,
          },
          200,
          origin
        );
      } catch (e) {
        return json(
          { error: "Worker error calling OpenAI", details: String((e && e.message) || e) },
          500,
          origin
        );
      }
    }

    // --- fallback ---
    return json({ error: "Not found" }, 404, origin);
  },
};
