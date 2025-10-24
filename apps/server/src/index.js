// Cloudflare Worker — EssayCoach (JS version)
// Endpoints: health, trial, me, checkout, portal, stripe webhook, correct (OpenAI)

const ALLOWED_ORIGINS = new Set([
  "https://alfons149-cmyk.github.io",   // GitHub Pages
  "http://localhost:5173",
  "http://127.0.0.1:5173"
]);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,Stripe-Signature"
  };
}

function json(req, obj, status = 200, extraHeaders = {}) {
  const origin = req.headers.get("Origin") || "";
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
      ...extraHeaders
    }
  });
}

function nowISO() { return new Date().toISOString(); }
function isFuture(iso) { return new Date(iso).getTime() > Date.now(); }
function addMonths(baseISO, months) {
  const d = new Date(baseISO);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}
function wc(s = "") { const m = String(s).trim().match(/\S+/g); return m ? m.length : 0; }

async function hmacBase64(data, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// Trial token (compact HMAC; not JWT to avoid deps)
async function signTrial(sub, hours, secret) {
  const exp = Math.floor(Date.now() / 1000) + hours * 3600;
  const payload = btoa(JSON.stringify({ sub, typ: "trial", exp }));
  const sig = await hmacBase64(payload, secret);
  return `${payload}.${sig}`;
}
async function verifyTrial(token, secret) {
  const [payload, sig] = String(token || "").split(".");
  if (!payload || !sig) return null;
  const good = await hmacBase64(payload, secret);
  if (sig !== good) return null;
  const data = JSON.parse(atob(payload));
  if (data.exp * 1000 <= Date.now()) return null;
  return data; // { sub, typ: 'trial', exp }
}

// Stripe helpers
function formBody(params) { return new URLSearchParams(params).toString(); }
async function stripeFetch(env, path, init = {}) {
  const headers = init.headers || {};
  return fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET}`, ...headers }
  });
}
async function verifyStripeWebhook(env, req, rawBody) {
  const sig = req.headers.get("Stripe-Signature") || "";
  const parts = Object.fromEntries(sig.split(",").map(s => s.split("=")));
  if (!parts.t || !parts.v1) return false;

  const signed = `${parts.t}.${new TextDecoder().decode(rawBody)}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
  const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== parts.v1.length) return false;
  let diff = 0; for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}

// OpenAI call (strict JSON) → transform to FE schema
async function callOpenAI(env, level, task, essay, style, formal) {
  const systemPrompt = `
You are EssayCoach, a Cambridge B2/C1/C2 writing coach.

DO:
- Correct grammar, spelling, clause punctuation (“; however,” vs “, but”), a/an, spacing, and formality (avoid slang; avoid contractions if formal=true).
- Preserve meaning; do not invent content.
- Use British spelling.
- Provide clear, exam-safe corrections.

INTENSIFIERS RULE (apply at B2/C1/C2):
Target: very, really, truly, actually, extremely.
- At B2: remove intensifier; keep base adjective. Add options in "alternatives".
- At C1/C2: replace intensifier phrase with a precise formal alternative. Add options too.

RETURN STRICT JSON ONLY:
{
  "corrected": "string",
  "notes": ["short bullet notes"],
  "alternatives": { "word": ["formal1","formal2"] },
  "replacements": [ { "from": "string", "to": "string" } ]
}

Voice/style (if provided): ${style}
`.trim();

  const userPrompt = `
LEVEL: ${level}
FORMAL: ${formal ? "Yes" : "No"}
TASK (context only): ${task || "(none)"}

Correct this text according to the rules above:

${essay}
`.trim();

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!r.ok) throw new Error(`OpenAI ${r.status} – ${await r.text()}`);

  const data = await r.json();
  const raw = data?.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);

  const corrected    = String(parsed.corrected || essay);
  const notes        = Array.isArray(parsed.notes) ? parsed.notes.map(String) : [];
  const replacements = Array.isArray(parsed.replacements) ? parsed.replacements : [];

  const feedback = notes.length ? `• ${notes.join("\n• ")}` : "Corrections applied.";
  const edits = replacements.map(r => ({
    from: String(r.from || ""),
    to:   String(r.to   || ""),
    reason: "Intensifier/precision"
  })).filter(e => e.from && e.to);

  return { feedback, edits, nextDraft: corrected };
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const url = new URL(req.url);

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // Health
    if (req.method === "GET" && (url.pathname === "/api/health" || url.pathname === "/ping")) {
      return json(req, { ok: true, now: nowISO() });
    }

    // ----- TRIAL: start (no card) -----
    if (req.method === "POST" && url.pathname === "/api/trial/start") {
      if (!env.TRIAL_SECRET) return json(req, { error: "TRIAL_SECRET not set" }, 500);
      const { email } = await req.json().catch(() => ({}));
      const sub = email || crypto.randomUUID();
      const token = await signTrial(sub, 48, env.TRIAL_SECRET);
      return json(req, { ok: true, token });
    }

    // ----- ENTITLEMENTS: me -----
    if (req.method === "GET" && url.pathname === "/api/me") {
      const auth = req.headers.get("Authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      const qEmail = url.searchParams.get("email") || "";

      // Trial token
      if (token && env.TRIAL_SECRET) {
        const claim = await verifyTrial(token, env.TRIAL_SECRET);
        if (claim?.typ === "trial") {
          return json(req, { entitled: true, source: "trial", until: new Date(claim.exp * 1000).toISOString() });
        }
      }

      // Stripe entitlement by email in KV
      if (qEmail) {
        const rec = await env.KV_ENTITLEMENTS.get(qEmail, { type: "json" });
        if (rec?.access_until && isFuture(rec.access_until)) {
          return json(req, { entitled: true, source: "stripe", until: rec.access_until });
        }
      }

      return json(req, { entitled: false });
    }

    // ----- STRIPE: Checkout -----
    if (req.method === "POST" && url.pathname === "/api/checkout") {
      const { plan, email } = await req.json().catch(() => ({}));
      if (!["month","semester"].includes(plan)) return json(req, { error: "plan must be month|semester" }, 400);
      if (!email) return json(req, { error: "email required" }, 400);
      if (!env.STRIPE_SECRET) return json(req, { error: "STRIPE_SECRET not set" }, 500);

      const price = plan === "month" ? env.STRIPE_PRICE_MONTH : env.STRIPE_PRICE_SEMESTER;
      const body = formBody({
        mode: "subscription",
        success_url: `${env.APP_URL}/?purchased=1`,
        cancel_url:  `${env.APP_URL}/?canceled=1`,
        customer_email: email,
        allow_promotion_codes: "true",
        "line_items[0][price]": price,
        "line_items[0][quantity]": "1"
      });

      const r = await stripeFetch(env, "/v1/checkout/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });
      const js = await r.json();
      if (!r.ok) return json(req, js, 500);
      return json(req, { url: js.url });
    }

    // ----- STRIPE: Billing portal (optional) -----
    if (req.method === "POST" && url.pathname === "/api/portal") {
      const { email } = await req.json().catch(() => ({}));
      if (!email) return json(req, { error: "email required" }, 400);
      if (!env.STRIPE_SECRET) return json(req, { error: "STRIPE_SECRET not set" }, 500);

      // Find customer by email (Stripe Search API)
      const search = await fetch(`https://api.stripe.com/v1/customers/search?query=${encodeURIComponent(`email:'${email}'`)}`, {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET}` }
      });
      const sc = await search.json();
      if (!sc?.data?.length) return json(req, { error: "Customer not found" }, 404);

      const body = formBody({ customer: sc.data[0].id, return_url: env.APP_URL });
      const r = await stripeFetch(env, "/v1/billing_portal/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });
      const js = await r.json();
      if (!r.ok) return json(req, js, 500);
      return json(req, { url: js.url });
    }

    // ----- STRIPE: Webhook -----
    if (req.method === "POST" && url.pathname === "/api/stripe/webhook") {
      if (!env.STRIPE_WEBHOOK_SECRET) return new Response("Missing webhook secret", { status: 500 });
      const raw = await req.arrayBuffer();
      const ok = await verifyStripeWebhook(env, req, raw);
      if (!ok) return new Response("Bad signature", { status: 400 });

      const event = JSON.parse(new TextDecoder().decode(raw));
      try {
        if (event.type === "checkout.session.completed") {
          const s = event.data.object;
          if (s.mode === "subscription") {
            const subId = s.subscription;
            const email = s.customer_details?.email;
            const sub = await stripeFetch(env, `/v1/subscriptions/${subId}`, { method: "GET" }).then(r => r.json());
            const priceId = sub.items?.data?.[0]?.price?.id;
            const months = (priceId === env.STRIPE_PRICE_MONTH) ? 1 : 6;
            const current = (await env.KV_ENTITLEMENTS.get(email, { type: "json" })) || { access_until: nowISO() };
            const base = isFuture(current.access_until) ? current.access_until : nowISO();
            await env.KV_ENTITLEMENTS.put(email, JSON.stringify({ access_until: addMonths(base, months) }));
          }
        }

        if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
          const sub = event.data.object;
          const cust = await stripeFetch(env, `/v1/customers/${sub.customer}`, { method: "GET" }).then(r => r.json());
          const email = cust.email;
          const priceId = sub.items?.data?.[0]?.price?.id;
          const months = (priceId === env.STRIPE_PRICE_MONTH) ? 1 : 6;

          if (["active","trialing","past_due","unpaid"].includes(sub.status)) {
            const current = (await env.KV_ENTITLEMENTS.get(email, { type: "json" })) || { access_until: nowISO() };
            const base = isFuture(current.access_until) ? current.access_until : nowISO();
            await env.KV_ENTITLEMENTS.put(email, JSON.stringify({ access_until: addMonths(base, months) }));
          } else {
            await env.KV_ENTITLEMENTS.delete(email);
          }
        }

        if (event.type === "customer.subscription.deleted") {
          const sub = event.data.object;
          const cust = await stripeFetch(env, `/v1/customers/${sub.customer}`, { method: "GET" }).then(r => r.json());
          await env.KV_ENTITLEMENTS.delete(cust.email);
        }
      } catch (e) {
        return new Response("Webhook handling error", { status: 500 });
      }
      return new Response("ok", { status: 200 });
    }

    // ----- OpenAI corrector -----
    if (req.method === "POST" && url.pathname === "/api/correct") {
      const { level = "C1", task = "", essay = "", style = "", formal = true, text } =
        await req.json().catch(() => ({}));

      const lvl = String(level).toUpperCase();
      const src = typeof essay === "string" && essay ? essay : (typeof text === "string" ? text : "");
      if (!src) return json(req, { error: "Missing essay/text string." }, 400);
      if (!["B2","C1","C2"].includes(lvl)) return json(req, { error: "Invalid level (B2|C1|C2)" }, 400);
      if (!env.OPENAI_API_KEY) return json(req, { error: "OPENAI_API_KEY not set" }, 500);

      try {
        const { feedback, edits, nextDraft } = await callOpenAI(env, lvl, task, src, style, formal);
        return json(req, {
          level: lvl,
          inputWords: wc(src),
          outputWords: wc(nextDraft),
          feedback,
          edits,
          nextDraft
        });
      } catch (e) {
        return json(req, { error: String(e?.message || e) }, 500);
      }
    }

    return json(req, { error: "Not found" }, 404);
  }
};
