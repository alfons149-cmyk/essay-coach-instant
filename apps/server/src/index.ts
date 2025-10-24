export interface Env {
  // Secrets (set with `wrangler secret put ...`)
  OPENAI_API_KEY: string;
  STRIPE_SECRET: string;
  STRIPE_WEBHOOK_SECRET: string;
  TRIAL_SECRET: string; // create your own (do not reuse Stripe secret)

  // Vars (in wrangler.toml)
  APP_URL: string;                // https://alfons149-cmyk.github.io/essay-coach-instant
  STRIPE_PRICE_MONTH: string;     // €15 monthly price id
  STRIPE_PRICE_SEMESTER: string;  // €75 every 6 months price id

  // KV binding (in wrangler.toml)
  KV_ENTITLEMENTS: KVNamespace;
}

/* ------------------------- CORS ------------------------- */
const ALLOW_ORIGINS = [
  "https://alfons149-cmyk.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

function withCORS(req: Request, init: ResponseInit = {}): ResponseInit {
  const origin = req.headers.get("Origin") || "";
  const ok = ALLOW_ORIGINS.some(o => origin.startsWith(o));
  return {
    ...init,
    headers: {
      "Access-Control-Allow-Origin": ok ? origin : "",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,Stripe-Signature",
      ...(init.headers || {})
    }
  };
}
function json(req: Request, data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), withCORS(req, { status: init.status || 200, headers: { "Content-Type": "application/json", ...(init.headers||{}) } }));
}
function okOptions(req: Request) { return new Response(null, withCORS(req, { status: 204 })); }
function bad(req: Request, msg = "Bad request", code = 400) { return json(req, { error: msg }, { status: code }); }

/* -------------------- Time & small helpers -------------------- */
const nowISO = () => new Date().toISOString();
const isFuture = (iso: string) => new Date(iso).getTime() > Date.now();
function addMonths(baseISO: string, months: number) {
  const d = new Date(baseISO); d.setMonth(d.getMonth() + months); return d.toISOString();
}
const wc = (t: string) => (t.trim().match(/\S+/g) || []).length;

/* ---------------- Trial token (HMAC, Worker-friendly) ---------------- */
async function signTrial(sub: string, hours: number, secret: string) {
  const exp = Math.floor(Date.now()/1000) + hours*3600;
  const payload = btoa(JSON.stringify({ sub, typ: "trial", exp }));
  const sig = await hmacBase64(payload, secret);
  return `${payload}.${sig}`;
}
async function verifyTrial(token: string, secret: string): Promise<null | { sub: string; typ: "trial"; exp: number }> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (await hmacBase64(payload, secret) !== sig) return null;
  const data = JSON.parse(atob(payload));
  if (data.exp*1000 <= Date.now()) return null;
  return data;
}
async function hmacBase64(data: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/* ------------------------- Stripe helpers ------------------------- */
function formBody(params: Record<string,string>) { return new URLSearchParams(params).toString(); }
async function stripeFetch(env: Env, path: string, init?: RequestInit) {
  return fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET}`,
      ...(init?.headers || {})
    }
  });
}

/* Webhook verify: compare HMAC SHA-256 (v1) over `${t}.${rawBody}` */
async function verifyStripeWebhook(env: Env, req: Request, raw: ArrayBuffer) {
  const sig = req.headers.get("Stripe-Signature") || "";
  const parts = Object.fromEntries(sig.split(",").map(s => s.split("=") as [string,string]));
  if (!parts.t || !parts.v1) return false;
  const signed = `${parts.t}.${new TextDecoder().decode(raw)}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
  const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2,"0")).join("");
  if (hex.length !== parts.v1.length) return false;
  let diff = 0; for (let i=0;i<hex.length;i++) diff |= hex.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}

/* ------------------------ OpenAI call ------------------------ */
async function callOpenAI(env: Env, level: string, task: string, essay: string) {
  const system = `You are an experienced Cambridge examiner. Return strict JSON with keys:
- "feedback": short paragraph (<= 120 words)
- "edits": array of 2–8 objects { "from": "...", "to": "...", "reason": "..." }
- "nextDraft": the revised essay
Be concise and student-friendly. Level: ${level}.`;
  const user = `Task: ${task || "(none)"}\n\nEssay:\n${essay}`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status} – ${await r.text()}`);

  const data = await r.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);
  return {
    feedback: String(parsed.feedback || ""),
    edits: Array.isArray(parsed.edits) ? parsed.edits : [],
    nextDraft: String(parsed.nextDraft || essay),
  };
}

/* ============================= Worker ============================= */
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return okOptions(req);

    const url = new URL(req.url);
    const { pathname, searchParams } = url;

    // -------- Health
    if (pathname === "/api/health") {
      return json(req, { ok: true, now: nowISO() });
    }

    // -------- Trial start (48h, no card)
    if (pathname === "/api/trial/start" && req.method === "POST") {
      const { email } = await req.json().catch(() => ({}));
      const subject = email || crypto.randomUUID();
      const token = await signTrial(subject, 48, env.TRIAL_SECRET);
      return json(req, { ok: true, token });
    }

    // -------- Entitlement check (trial token or KV by email)
    if (pathname === "/api/me" && req.method === "GET") {
      const auth = req.headers.get("Authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      const claim = token ? await verifyTrial(token, env.TRIAL_SECRET) : null;
      const email = searchParams.get("email") || "";

      if (claim?.typ === "trial") {
        return json(req, { entitled: true, source: "trial", until: new Date(claim.exp*1000).toISOString() });
      }
      if (email) {
        const rec = await env.KV_ENTITLEMENTS.get(email, { type: "json" }) as { access_until: string } | null;
        if (rec && isFuture(rec.access_until)) {
          return json(req, { entitled: true, source: "stripe", until: rec.access_until });
        }
      }
      return json(req, { entitled: false });
    }

    // -------- Stripe Checkout (subscriptions)
    if (pathname === "/api/checkout" && req.method === "POST") {
      const { plan, email } = await req.json().catch(() => ({}));
      if (!["month","semester"].includes(plan)) return bad(req, "plan must be month|semester");
      if (!email) return bad(req, "email required");
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
      if (!r.ok) return json(req, js, { status: 500 });
      return json(req, { url: js.url });
    }

    // -------- Stripe Webhook
    if (pathname === "/api/stripe/webhook" && req.method === "POST") {
      const raw = await req.arrayBuffer();
      const ok = await verifyStripeWebhook(env, req, raw);
      if (!ok) return new Response("Bad signature", { status: 400 });

      const event = JSON.parse(new TextDecoder().decode(raw));
      try {
        if (event.type === "checkout.session.completed") {
          const s = event.data.object;
          if (s.mode === "subscription") {
            const subId = s.subscription;
            const email = s.customer_details?.email as string;
            // Fetch subscription to get price id
            const sub = await stripeFetch(env, `/v1/subscriptions/${subId}`, { method: "GET" }).then(r=>r.json());
            const priceId = sub.items?.data?.[0]?.price?.id as string;
            const months = (priceId === env.STRIPE_PRICE_MONTH) ? 1 : 6;
            const current = (await env.KV_ENTITLEMENTS.get(email, { type: "json" })) || { access_until: nowISO() };
            const base = isFuture(current.access_until) ? current.access_until : nowISO();
            await env.KV_ENTITLEMENTS.put(email, JSON.stringify({ access_until: addMonths(base, months) }));
          }
        }

        if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
          const sub = event.data.object;
          // get customer email
          const cust = await stripeFetch(env, `/v1/customers/${sub.customer}`, { method: "GET" }).then(r=>r.json());
          const email = cust.email as string;
          const priceId = sub.items?.data?.[0]?.price?.id as string;
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
          const cust = await stripeFetch(env, `/v1/customers/${sub.customer}`, { method: "GET" }).then(r=>r.json());
          await env.KV_ENTITLEMENTS.delete(cust.email);
        }
      } catch (e) {
        return new Response("Webhook handling error", { status: 500 });
      }
      return new Response("ok", { status: 200 });
    }

    // -------- OpenAI-backed corrector
    if (pathname === "/api/correct" && req.method === "POST") {
      const { level, task, essay } = await req.json().catch(() => ({}));
      if (!["B2","C1","C2"].includes(level)) return bad(req, "Invalid level");
      if (!essay || typeof essay !== "string") return bad(req, "Missing essay");

      try {
        const result = await callOpenAI(env, level, String(task || ""), essay);
        return json(req, {
          level,
          inputWords: wc(essay),
          outputWords: wc(result.nextDraft || ""),
          feedback: result.feedback || "",
          edits: result.edits || [],
          nextDraft: result.nextDraft || essay
        });
      } catch (e: any) {
        return json(req, { error: e?.message || "OpenAI error" }, { status: 500 });
      }
    }

    // Fallback
    return new Response("Not found", withCORS(req, { status: 404 }));
  }
};
