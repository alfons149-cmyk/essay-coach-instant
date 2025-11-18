// worker.js — EssayCoach Worker
// Rich teacher feedback + vocabulary suggestions + sentence & paragraph insights

const ALLOWED_ORIGINS = new Set([
  "https://alfons149-cmyk.github.io", // GitHub Pages
  "http://localhost:5173",            // Local dev (adjust if needed)
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
      return json(
        { ok: true, originMatched: ALLOWED_ORIGINS.has(origin) },
        200,
        origin
      );
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

        const {
          essay,
          task = "",
          level = "C1",
          formal = true,
          style = "",
        } = payload || {};

        if (!essay || typeof essay !== "string") {
          return json({ error: "Missing 'essay' (string)." }, 400, origin);
        }

        const OPENAI_API_KEY = env.OPENAI_API_KEY;
        if (!OPENAI_API_KEY) {
          return json({ error: "OPENAI_API_KEY not set" }, 500, origin);
        }

        const MODEL = env.OPENAI_MODEL || "gpt-4o-mini";

        // ================== SYSTEM PROMPT ==================
        const systemPrompt = `
You are EssayCoach, a Cambridge English writing teacher and mentor.

You MUST return STRICT JSON with EXACT keys (no extra keys):

{
  "feedback": "warm teacher-style paragraph (80–150 words)",
  "edits": [
    { "from": "string", "to": "string", "reason": "short reason" }
  ],
  "nextDraft": "fully corrected essay in British English",
  "vocabularySuggestions": {
    "word or phrase": ["alt1","alt2","alt3 (optional)"]
  },
  "sentenceInsights": [
    {
      "example": "exact sentence from the learner",
      "issue": "short label of the problem",
      "explanation": "brief teacher explanation",
      "betterVersion": "improved sentence",
      "linkHint": "optional short hint like 'See Unit 2 – Complex sentences'"
    }
  ],
  "paragraphInsights": [
    {
      "paragraph": 1,
      "role": "intro|body|conclusion",
      "issue": "short label of the problem",
      "explanation": "brief teacher explanation about paragraph logic",
      "suggestion": "concrete improvement tip (not a full rewrite)",
      "linkHint": "optional short hint like 'See Unit 5 – Paragraph flow'"
    }
  ]
}

---------------- FEEDBACK (Alfons voice) ----------------
- Warm, honest, emotionally intelligent.
- Mix short sentences with a few slower, reflective ones.
- Use clear, non-technical language.
- Always include 1–2 concrete, practical things the student can try in the next draft.
- Sound like a supportive Cambridge teacher, not a robot.

---------------- NEXTDRAFT (corrected essay) -------------
- Correct grammar, punctuation, register, clarity, clause punctuation.
- Use BRITISH English spelling.
- Keep the learner's ideas and structure whenever possible. Do not invent new content.
- Suitable for the given CEFR level (B2, C1, C2).

---------------- VOCABULARY SUGGESTIONS -----------------
Good examples:
- "however": ["nevertheless", "nonetheless"]
- "because": ["as", "since"]
- "a lot": ["many", "numerous", "substantially"]
- "very important": ["crucial", "paramount"]

---------------- SENTENCEINSIGHTS ------------------------
Goal: pick 2–4 sentences that are *teachable*.
Each object:
- example: the learner's original sentence (exact text).
- issue: short label, e.g. "run-on sentence", "missing subject", "weak linker".
- explanation: one or two short teacher-style sentences.
- betterVersion: a corrected or improved version at the same CEFR level.
- linkHint: optional, small pointer like "See Unit 2 – Simple vs complex sentences".

Level focus:
- B2: focus on clear subject–verb agreement, simple complex sentences,
      correct basic connectors (because, although, however), and run-on sentences.
- C1: focus on variety of complex clauses, more precise connectors
      (whereas, in contrast, nonetheless, consequently).
- C2: focus on very natural flow, avoiding clunky nominalisations,
      awkward repetition, and overuse of high-register phrases.

---------------- PARAGRAPHINSIGHTS ----------------------
Goal: 2–3 insights per essay about paragraph logic and structure.

For each object:
- paragraph: 1-based index of the paragraph (1 = first paragraph).
- role: "intro", "body", or "conclusion".
- issue: short label, e.g. "weak topic sentence", "unclear progression".
- explanation: a brief teacher-style explanation.
- suggestion: practical improvement tip (how to rewrite or reorganise),
             NOT a full re-written paragraph.
- linkHint: optional, small pointer like "See Unit 3 – Topic sentences".

Level focus:
- B2: topic sentences, one main idea per paragraph, simple transitions
      (firstly, secondly, however, on the other hand).
- C1: clearer development of arguments, more specific linking between paragraphs,
      avoiding repetition of ideas.
- C2: sophisticated cohesion (therefore, consequently, in light of this),
      subtle logical relationships, and avoiding circular argumentation.
`.trim();
        // ==================================================

        const userPrompt = `
LEVEL: ${level}
FORMAL: ${formal ? "Yes" : "No"}
STYLE: ${style || "Standard academic"}
TASK: ${task || "(none)"}

Provide feedback, edits, nextDraft, vocabularySuggestions,
sentenceInsights and paragraphInsights for this learner essay:

${essay}
`.trim();

        // ---- OpenAI call ----
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            temperature: 0.5,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });

        if (!r.ok) {
          const errBody = await r.text().catch(() => "(no body)");
          return json(
            { error: `OpenAI HTTP ${r.status}`, details: errBody },
            r.status,
            origin
          );
        }

        const data = await r.json();
        const raw = data?.choices?.[0]?.message?.content || "{}";

        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return json(
            { error: "Model did not return valid JSON", raw },
            502,
            origin
          );
        }

        const nextDraft = String(parsed.nextDraft || "").trim();
        const feedback = String(parsed.feedback || "").trim();

        const edits = Array.isArray(parsed.edits)
          ? parsed.edits.map((e) => ({
              from: String(e.from || "").trim(),
              to: String(e.to || "").trim(),
              reason: String(e.reason || "clarity").trim(),
            }))
          : [];

        const vocabularySuggestions =
          parsed.vocabularySuggestions &&
          typeof parsed.vocabularySuggestions === "object"
            ? parsed.vocabularySuggestions
            : {};

        const sentenceInsights = Array.isArray(parsed.sentenceInsights)
          ? parsed.sentenceInsights
              .map((si) => ({
                example: String(si.example || "").trim(),
                issue: String(si.issue || "").trim(),
                explanation: String(si.explanation || "").trim(),
                betterVersion: String(si.betterVersion || "").trim(),
                linkHint: String(si.linkHint || "").trim(),
              }))
              .filter(
                (si) =>
                  si.example && si.issue && si.explanation && si.betterVersion
              )
          : [];

        const paragraphInsights = Array.isArray(parsed.paragraphInsights)
          ? parsed.paragraphInsights
              .map((pi) => ({
                paragraph: Number.isFinite(pi.paragraph)
                  ? Number(pi.paragraph)
                  : null,
                role: String(pi.role || "").trim(), // intro|body|conclusion
                issue: String(pi.issue || "").trim(),
                explanation: String(pi.explanation || "").trim(),
                suggestion: String(pi.suggestion || "").trim(),
                linkHint: String(pi.linkHint || "").trim(),
              }))
              .filter(
                (pi) =>
                  pi.paragraph &&
                  pi.role &&
                  pi.issue &&
                  pi.explanation &&
                  pi.suggestion
              )
          : [];

        if (!nextDraft) {
          return json(
            { error: 'Missing "nextDraft" field in model response', raw: parsed },
            502,
            origin
          );
        }

        const wcIn = (essay.trim().match(/\S+/g) || []).length;
        const wcOut = (nextDraft.trim().match(/\S+/g) || []).length;

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
            paragraphInsights,
          },
          200,
          origin
        );
      } catch (e) {
        return json(
          {
            error: "Worker error calling OpenAI",
            details: String(e?.message || e),
          },
          500,
          origin
        );
      }
    }

    // --- Fallback ---
    return json({ error: "Not found" }, 404, origin);
  },
};
