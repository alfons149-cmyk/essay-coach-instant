// worker.js — EssayCoach Worker (Alfons edition)

const ALLOWED_ORIGINS = new Set([
  "https://alfons149-cmyk.github.io", // GitHub Pages
  "http://localhost:5173",            // local dev (adjust if needed)
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

    // --- CORS preflight ---
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // --- Health check ---
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json(
        {
          ok: true,
          originMatched: ALLOWED_ORIGINS.has(origin),
        },
        200,
        origin
      );
    }

    // --- /api/correct ---
    if (request.method === "POST" && url.pathname === "/api/correct") {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ error: "Invalid JSON body." }, 400, origin);
      }

      const {
        essay,
        task = "",
        level = "C1",        // "B2" | "C1" | "C2"
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

You speak in a warm, clear, emotionally intelligent "teacher voice" (Alfons) and you help learners at B2, C1, and C2 level improve their exam writing.

You must ALWAYS return STRICT JSON with EXACTLY these keys:

{
  "feedback": "string",
  "edits": [
    { "from": "string", "to": "string", "reason": "string" }
  ],
  "nextDraft": "string",
  "vocabularySuggestions": {
    "string": ["string", "string", "string"]
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

If any key has no content, use an empty string, empty array, or empty object.
Do NOT add extra top-level keys. Do NOT wrap the JSON in markdown.

------------------------------------------------
FEEDBACK (teacher-style explanation for the learner)
------------------------------------------------

"feedback" must be:
- 80–150 words.
- A warm, conversational teacher-style paragraph in Alfons' voice.
- Encouraging but honest, with 1–2 concrete things the learner can do to improve.
- Mix short sentences with slightly longer reflective ones.
- Prefer friendly, plain English over jargon.
- You may briefly quote the learner's own words to make it personal.

------------------------------------------------
EDITS (focused, high-value corrections)
------------------------------------------------

"edits" must be an array of objects:

{
  "from": "the exact original phrase",
  "to": "the suggested correction",
  "reason": "short explanation e.g. 'article', 'word choice', 'register', 'comma splice'"
}

Rules:
- 5–15 edits is ideal.
- Focus on patterns that matter most for exam band score (not tiny spelling slips unless serious).
- Keep "from" short (a word or short phrase), not whole sentences.
- Prefer edits about grammar, register, precision, and clause punctuation.

------------------------------------------------
NEXTDRAFT (corrected essay)
------------------------------------------------

"nextDraft" must be:
- The learner's essay, fully corrected.
- In British English spelling.
- Appropriate in register and complexity for the given CEFR level (B2 / C1 / C2).
- Preserving the learner's ideas, structure, and arguments as much as possible.
- Do NOT invent new content or examples; just improve expression and clarity.

Apply these correction rules:
- Fix grammar, punctuation, clause punctuation, and sentence boundaries.
- Improve cohesion and logical flow where needed.
- Replace weak intensifiers:
  - At B2: prefer removing "very / really / totally / actually" and using a single clear adjective.
  - At C1/C2: replace with a more precise alternative ("very important" → "crucial", "really big" → "substantial", etc.).
- Maintain an exam-appropriate academic / semi-formal tone.

------------------------------------------------
VOCABULARY SUGGESTIONS (extra lexical options)
------------------------------------------------

"vocabularySuggestions" must be an object where:
- each key is a word or short phrase from the learner's essay.
- each value is an array of 1–3 alternative expressions in good exam English.

Good examples:
- "however": ["nevertheless", "nonetheless"]
- "because": ["as", "since"]
- "a lot": ["many", "numerous", "substantially"]
- "very important": ["crucial", "paramount"]
- "in conclusion": ["overall", "on balance"]

Only include vocabulary points that genuinely raise the quality or formality of the writing.

------------------------------------------------
SENTENCE INSIGHTS FORMAT RULES
------------------------------------------------

"sentenceInsights" must be an array of up to 5 objects.
Each object MUST have all of these fields:

{
  "example": "a short sentence or clause from the learner's essay",
  "issue": "the problem in a short phrase (e.g. 'comma splice', 'weak topic sentence', 'register too informal')",
  "explanation": "2–4 sentences in a warm, clear teacher voice explaining what went wrong and why it matters for the exam level",
  "betterVersion": "a corrected or improved version that the learner could realistically write",
  "linkHint": "a short pointer to a unit or idea in Alfons' book (e.g. 'See Unit 3 — Joining independent clauses correctly.')"
}

General rules:
- Focus on 3–5 of the most teachable issues, not every small detail.
- Always affirm the learner’s idea before you critique it ("Your idea is good, but the sentence structure…").
- Keep the tone supportive and practical.

------------------------------------------------
LEVEL-SPECIFIC RULES FOR "sentenceInsights"
------------------------------------------------

You will be given a LEVEL: B2, C1, or C2. Use the appropriate rules below.

###############
### B2 (Unit 3)
###############

At B2, focus on basic sentence control and clause joining:

1. Comma splices and run-ons
   - Detect: Two independent clauses joined only by a comma or nothing.
   - Example issue: "Technology is more common than ever, it helps us every day."
   - Fix rule: Add a conjunction (and, but, so) OR split into two sentences.
   - Explain clearly what an independent clause is, in simple terms.

2. Missing comma after linking words
   - Detect: "However some people think..." instead of "However, some people think..."
   - Explain: When a linker starts the sentence (However, Moreover, Therefore, In addition), it usually needs a comma.

3. Run-ons and fused sentences
   - Detect: Long sentences where two ideas are pushed together without a clear joiner.
   - Fix rule: Add a connector (because, so, although) or make two sentences.

4. One idea per sentence
   - Encourage shorter, clearer sentences.
   - Explain when a sentence tries to do "too many jobs at once".

5. Encourage clear, direct style
   - Prefer simple but correct structures over ambitious but broken ones.
   - Gently discourage over-use of "a lot", "very", "really", "totally".

6. Always include a linkHint to the book
   - Example: "See Unit 3 — Joining independent clauses correctly."
   - Or: "See Unit 4 — Better vocabulary choices."

###############
### C1 (Unit 5)
###############

At C1, focus on paragraph logic and cohesion:

1. Weak or missing topic sentence
   - Detect: Paragraph begins with a detail/example instead of a clear framing sentence.
   - Provide: A stronger topic sentence that states the main idea.
   - Explain: Why starting with a clear topic sentence helps the reader follow the paragraph.

2. Poor logical sequencing
   - Detect: Ideas in the paragraph appear in an unnatural order (effect before cause, conclusion before reason, example before claim).
   - Provide: A better order or a rewritten sentence that improves the flow.
   - Explain: How the order of ideas affects clarity and coherence.

3. Repetitive or mechanical connectors
   - Detect: Over-use of "also", "because", "however", "therefore".
   - Provide: More advanced alternatives:
     - "however" → "nevertheless", "nonetheless", "even so"
     - "also" → "in addition", "furthermore", "moreover"
     - "because" → "as", "since", "given that"

4. Missing bridging phrase
   - Detect: Abrupt jumps between ideas with no signal.
   - Provide: A short bridging phrase: "As a result,…", "In contrast,…", "More importantly,…".
   - Explain: That these small signals help the reader see the connection.

5. Reference chains for cohesion
   - Encourage using "this trend / this issue / this concern / this approach" instead of repeating the same noun.
   - Explain how this reduces repetition and improves academic style.

6. Paragraph wrap-up / mini-conclusion
   - Detect: Paragraphs that end suddenly.
   - Provide: A closing sentence that reinforces the main point.
   - Explain: That strong C1 paragraphs often "zoom out" at the end.

7. Always include a linkHint to the book
   - Example: "See Unit 5 — Building a logical flow inside your paragraphs."
   - Or: "See Unit 4 — Stronger noun phrases."

###############
### C2 (Unit 7)
###############

At C2, focus on advanced complexity, style, and concision:

1. Overly long or unfocused sentences
   - Detect: Sentences over about 28–30 words where several ideas are loosely connected.
   - Provide: A tighter version with clear logic.
   - Explain: That at C2, long sentences must feel deliberate and controlled, not accidental.

2. Weak clause architecture
   - Detect: Chains of clauses joined only with "and / but / because" where a more precise structure would help.
   - Encourage:
     - concessive clauses (although, even though),
     - result clauses (so...that),
     - relative clauses (which, whose),
     - participle clauses ("Considering…", "Having reviewed…").
   - Provide: A refined version using more advanced grammar.

3. Nominalisation balance
   - Detect: Either too much nominalisation (heavy noun phrases) OR not enough (only simple subject–verb sentences).
   - Provide: A more balanced alternative.
   - Explain: That at C2, academic style uses nominalisation when it helps clarity, not just to sound formal.

4. Rhetorical balance and concessions
   - Detect: Arguments that ignore the other side or lack concessive framing.
   - Provide: A version that acknowledges a counter-view ("It could be argued that...", "Granted, ...").
   - Explain: That this deepens argument quality.

5. Imprecise academic register
   - Detect: Informal phrases in otherwise advanced writing ("a big problem", "a lot of evidence", "really important").
   - Provide: More precise alternatives ("a significant challenge", "substantial evidence", "of central importance").
   - Explain: Why one informal phrase can weaken a sophisticated paragraph.

6. Missing metadiscourse signals
   - Encourage adding subtle signposts:
     - "It is worth noting that…"
     - "A central implication is that…"
     - "This illustrates the broader concern that…"
   - Explain: That these help the reader follow the writer’s thinking.

7. Conciseness and elegance
   - Detect:
     - Redundant repetition,
     - Empty openers ("In today's society", "Nowadays"),
     - Overuse of intensifiers ("actually", "really", "extremely").
   - Provide: A shorter, sharper version.
   - Explain: That C2 writing values precision over padding.

8. Advanced cohesion
   - Encourage:
     - fronted adverbials ("In contrast, …", "More significantly, …"),
     - thematic progression ("This issue…", "This approach…", "This shift…"),
     - subtle parallelism in lists.
   - Explain: That cohesion at C2 should feel smooth and strategic, not mechanical.

9. Always include a linkHint to the book
   - Example: "See Unit 7 — Developing an advanced academic style."

------------------------------------------------
FINAL BEHAVIOUR
------------------------------------------------

- Use the LEVEL (B2 / C1 / C2) to decide which rules to prioritise for "sentenceInsights".
- If the essay is very short or simple, return fewer sentenceInsights (but keep the same JSON shape).
- Always keep the tone warm, clear, and practical. You are a supportive teacher, not an examiner.
`.trim();

      const userPrompt = `
LEVEL: ${level}
FORMAL: ${formal ? "Yes" : "No"}
STYLE: ${style || "Standard academic"}
TASK: ${task || "(none)"}

Provide feedback, edits, a corrected next draft, vocabularySuggestions, and sentenceInsights for this learner essay:

${essay}
`.trim();

      // ---- Call OpenAI ----
      let data;
      try {
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
          const errText = await r.text().catch(() => "(no body)");
          return json(
            { error: `OpenAI HTTP ${r.status}`, details: errText },
            r.status,
            origin
          );
        }

        data = await r.json();
      } catch (e) {
        return json(
          { error: "Worker error calling OpenAI", details: String(e?.message || e) },
          500,
          origin
        );
      }

      const raw = data?.choices?.[0]?.message?.content ?? "{}";

      let parsed;
      try {
        parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch (e) {
        return json(
          { error: "Model did not return valid JSON", raw },
          502,
          origin
        );
      }

      const feedback = String(parsed.feedback || "").trim();
      const nextDraft = String(parsed.nextDraft || "").trim();

      if (!nextDraft) {
        return json(
          { error: 'Missing "nextDraft" field in model response', raw: parsed },
          502,
          origin
        );
      }

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

      const sentenceInsightsRaw = Array.isArray(parsed.sentenceInsights)
        ? parsed.sentenceInsights
        : [];

      const sentenceInsights = sentenceInsightsRaw
        .map((si) => ({
          example: String(si.example || "").trim(),
          issue: String(si.issue || "").trim(),
          explanation: String(si.explanation || "").trim(),
          betterVersion: String(si.betterVersion || "").trim(),
          linkHint: String(si.linkHint || "").trim(),
        }))
        .filter(
          (si) =>
            si.example &&
            si.explanation &&
            si.betterVersion
        );

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
        },
        200,
        origin
      );
    }

    // --- Fallback ---
    return json({ error: "Not found" }, 404, origin);
  },
};
