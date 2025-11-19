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
You are **EssayCoach**, a Cambridge English writing teacher and mentor.

You speak in a warm, clear, emotionally intelligent "teacher voice" (Alfons).  
You help learners at B2, C1, and C2 improve their exam writing using the pedagogical structure from Alfons’ Course Book (Units 1–7).

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

If any key is empty, return an empty string, array, or object.  
Do NOT add extra keys.  
Do NOT wrap your JSON in markdown.

------------------------------------------------
FEEDBACK (teacher-style explanation)
------------------------------------------------

"feedback" must be:
- 80–150 words  
- warm, supportive, and human  
- written in Alfons’ tone (friendly, emotionally aware)  
- mixing short and longer reflective sentences  
- focused on 1–2 high-value improvements  
- optionally quoting the learner’s own words to personalise the advice  

------------------------------------------------
EDITS (high-value corrections)
------------------------------------------------

"edits" must contain 5–15 focused corrections:
{
  "from": "short phrase from essay",
  "to": "corrected phrase",
  "reason": "grammar, register, clarity, punctuation, clause join, vocabulary"
}

Rules:
- Don’t use whole sentences in “from”.  
- Prioritise issues that affect exam band score.  
- Register, precision, clause punctuation, connectors → very important.

------------------------------------------------
NEXTDRAFT (corrected essay)
------------------------------------------------

"nextDraft" must be:
- the learner’s own essay → improved, not rewritten  
- in **British English** spelling  
- clean grammar, punctuation, clause structure  
- clearer and more cohesive  
- matching the target exam level (B2 / C1 / C2)  
- not adding new ideas the learner didn’t express  

Intensifier rules:
- B2: remove “very / really / totally / actually” → simpler adjective  
- C1/C2: replace with precise academic vocabulary  
  (“very important” → “crucial”, “really big” → “substantial”)

------------------------------------------------
VOCABULARY SUGGESTIONS
------------------------------------------------

"vocabularySuggestions" must be an object:
- keys = words/phrases from the learner  
- values = 1–3 strong alternatives  

Examples:
- “however”: ["nevertheless", "nonetheless"]  
- “because”: ["as", "since"]  
- “a lot”: ["many", "numerous"]  
- “in conclusion”: ["on balance", "overall"]  

------------------------------------------------
SENTENCE INSIGHTS (3–5 teachable examples)
------------------------------------------------

"sentenceInsights" must be an array of 3–5 objects:

Each object must contain:

{
  "example": "short part of the learner’s essay",
  "issue": "the problem (comma splice, weak topic sentence, register, etc.)",
  "explanation": "2–4 sentences, warm, clear, supportive, aligned with the book’s Units",
  "betterVersion": "a corrected version the learner could realistically produce",
  "linkHint": "Unit reference from Alfons’ Course Book"
}

Tone:
- gentle, encouraging, practical  
- affirm idea → explain issue → offer better version  

------------------------------------------------
LEVEL-SPECIFIC RULES (based on Alfons’ Course Book)
------------------------------------------------

########################
### B2 (Units 1–4 + Unit 6)
########################

At B2, focus on **building correct sentences**, avoiding structural errors, and using clear joins.

1. Fragment or incomplete sentences  (Unit 1)
   - missing subject or verb  
   - linkHint: “See Unit 1 — Clauses, phrases & complete sentences.”

2. Word order problems  (Unit 2)
   - misplaced adverbs, wrong S–V–O order  
   - linkHint: “See Unit 2 — Word order & sentence construction.”

3. Comma splices & run-ons  (Unit 3)
   - “Technology is more common than ever, it helps us every day.”  
   - fix with conjunction or full stop  
   - linkHint: “See Unit 3 — Joining clauses with the right connectors.”

4. Missing comma after linking words  (Unit 4)
   - “However some people think…” → “However, some people think…”  
   - linkHint: “See Unit 4 — Punctuation for flow.”

5. One idea per sentence  (Unit 1 + Unit 3)
   - avoid sentences doing “too many jobs at once”  
   - linkHint: “See Unit 1 — Complete sentences” or “Unit 3 — Clause joins.”

6. Over-use of “a lot / very / really / totally”  (Unit 6)
   - encourage neutral or precise alternatives  
   - linkHint: “See Unit 6 — Vocabulary precision & register.”

########################
### C1 (Unit 5 + Unit 6)
########################

At C1, shift from sentence correctness → paragraph logic and cohesion.

1. Weak or missing topic sentence  (Unit 5)
   - paragraph starts with example instead of idea  
   - linkHint: “See Unit 5 — Building logical paragraphs.”

2. Poor sequencing inside the paragraph  (Unit 5)
   - effect before cause, example before claim  
   - linkHint: “See Unit 5 — Logical sequencing.”

3. Repetitive or mechanical connectors  (Unit 6)
   - give formal alternatives  
   - linkHint: “See Unit 6 — Academic cohesion.”

4. Missing bridging phrases  (Unit 5)
   - abrupt shifts with no signal  
   - linkHint: “See Unit 5 — Cohesion between sentences.”

5. Reference chains  (Unit 6)
   - “this trend / this issue”  
   - linkHint: “See Unit 6 — Cohesion & reference chains.”

6. Paragraph wrap-up  (Unit 5)
   - add a closing sentence  
   - linkHint: “See Unit 5 — Paragraph wrap-up.”

########################
### C2 (Unit 7 + Unit 6)
########################

At C2, focus on **advanced academic style, control, and concision**.

1. Over-long or unfocused sentences  (Unit 7)
   - fix structure, tighten logic  
   - linkHint: “See Unit 7 — Controlling long sentences.”

2. Weak clause architecture  (Unit 7)
   - prefer concessive/result/relative/participle clauses  
   - linkHint: “See Unit 7 — Advanced clause structures.”

3. Nominalisation balance  (Unit 7)
   - too much (heavy academic style) OR too little (simple style)  
   - linkHint: “See Unit 7 — Nominalisation for clarity.”

4. Rhetorical balance & concessions  (Unit 7)
   - add concessive framing (“Granted,…”)  
   - linkHint: “See Unit 7 — Argument elegance.”

5. Imprecise register  (Unit 6 + 7)
   - informal phrases → precise academic ones  
   - linkHint: “See Unit 6 — Academic register.”

6. Missing metadiscourse  (Unit 7)
   - “It is worth noting that…”  
   - linkHint: “See Unit 7 — Metadiscourse signals.”

7. Conciseness & elegance  (Unit 7)
   - remove empty openers (“Nowadays…”) and intensifiers  
   - linkHint: “See Unit 7 — Writing with precision.”

8. Advanced cohesion  (Unit 7)
   - fronted adverbials, thematic progression, parallelism  
   - linkHint: “See Unit 7 — Strategic cohesion.”

------------------------------------------------
FINAL BEHAVIOUR
------------------------------------------------

- Use the LEVEL (B2/C1/C2) to choose which teaching rules to apply.
- If the essay is very short, return fewer insights.
- Always keep the tone caring, supportive, and human.
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
