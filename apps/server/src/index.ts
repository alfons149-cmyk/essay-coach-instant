export interface Env {
  OPENAI_API_KEY: string;
  STRIPE_SECRET: string;
  STRIPE_WEBHOOK_SECRET: string;
  APP_URL: string;
  STRIPE_PRICE_MONTH: string;
  STRIPE_PRICE_SEMESTER: string;
  KV_ENTITLEMENTS: KVNamespace;
}

const ALLOW_ORIGINS = [
  "https://alfons149-cmyk.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
];

function cors(req: Request, resInit: ResponseInit = {}): ResponseInit {
  const origin = req.headers.get("Origin") || "";
  const ok = ALLOW_ORIGINS.some(o => origin.startsWith(o));
  return {
    ...resInit,
    headers: {
      "Access-Control-Allow-Origin": ok ? origin : "",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,Stripe-Signature",
      ...(resInit.headers || {})
    }
  };
}

function json(req: Request, data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), cors(req, {
    status: init.status || 200,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) }
  }));
}

function bad(req: Request, msg = "Bad request", code = 400) {
  return json(req, { error: msg }, { status: code });
}

function nowISO() { return new Date().toISOString(); }
function isFuture(iso: string) { return new Date(iso).getTime() > Date.now(); }
function addMonths(baseISO: string, months: number) {
  const d = new Date(baseISO);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

// --- JWT-like trial token (HMAC SHA-256, compact & Worker-friendly) ---
async function signTrial(sub: string, hours = 48, secret: string) {
  const exp = Math.floor(Date.now() / 1000) + hours * 3600;
  const payload = btoa(JSON.stringify({ sub, typ: "trial", exp }));
  const sig = await hmac(payload, secret);
  return `${payload}.${sig}`;
}
async function verifyTrial(token: string, secret: string) {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const good = await hmac(payload, secret);
  if (good !== sig) return null;
  const data = JSON.parse(atob(payload));
  if (data.exp * 1000 <= Date.now()) return null;
  return data as { sub: string; typ: "trial"; exp: number };
}
async function hmac(data: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const bytes = new Uint8Array(sig);
  return btoa(String.fromCharCode(...bytes));
}

// --- Stripe helpers with fetch ---
async function stripeFetch(env: Env, path: string, init?: RequestInit) {
  const url = `https://api.stripe.com${path}`;
  const headers = {
    Authorization: `Bearer ${env.STRIPE_SECRET}`,
    "Content-Type": "application/x-www-form-urlencoded",
    ...(init?.headers || {})
  };
  return fetch(url, { ...init, headers });
}

function formBody(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

// Verify webhook signature (Stripe docs → HMAC SHA256 with signing secret)
async function verifyStripeSignature(env: Env, req: Request, rawBody: ArrayBuffer) {
  const sig = req.headers.get("Stripe-Signature") || "";
  // We keep it simple: rely on Stripe’s recommended library normally.
  // On Workers, do your own check: t=..., v1=...
  const parts = Object.fromEntries(sig.split(",").map(kv => kv.split("=") as [string,string]));
  if (!parts.t || !parts.v1) return false;

  const signedPayload = `${parts.t}.${new TextDecoder().decode(rawBody)}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2,"0")).join("");
  // constant-time-ish compare
  if (hex.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i=0;i<hex.length;i++) diff |= hex.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}

// --- OpenAI call (server-side) ---
async function callOpenAI(env: Env, level: string, task: string, essay: string) {
  const system = `You are an experienced Cambridge examiner. Provide concise feedback, list 2–6 targeted edits, and produce a revised next draft. Keep student-friendly tone. Level: ${level}.`;
  const user = `Task: ${task}\n\nEssay:\n${essay}`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",           // pick your model
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.3
    })
  });

  if (!r.ok) {
    const err = await r.text();
    throw new Error(`OpenAI error ${r.status}: ${err}`);
  }

  const data = await r.json();
  const text = data.choices?.[0]?.message?.content || "";

  // Very light parsing: expect sections separated by lines; keep it robust.
  // (Swap to structured tool-calling later if you want strict JSON.)
  const feedback = text.slice(0, 600);
  return {
    feedback,
    edits: [],
    nextDraft: essay // keep original if you don't parse; or add your quick transforms here
  };
}

function okOptions(req: Request) {
  return new Response(null, cors(req, { status: 204 }));
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return okOptions(req);

    const url = new URL(req.url);
    const { pathname, searchParams } = url;

    // ---- CORS precheck for non-OPTIONS too
    if (pathname.startsWith("/api/")) {
      // fall through to handlers
    }

    // Health
    if (pathname === "/api/health") {
      return json(req, { ok: true, now: nowISO() });
    }

    // Trial start
    if (pathname === "/api/trial/start" && req.method === "POST") {
      const { email } = await req.json().catch(() => ({}));
      const id = email || crypto.randomUUID();
      const token = await signTrial(id, 48, env.STRIPE_WEBHOOK_SECRET /* reuse a secret or add TRIAL_SECRET */);
      return json(req, { ok: true, token });
    }

    // Entitlement check
    if (pathname === "/api/me" && req.method === "GET") {
      const auth = req.headers.get("Authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      const claim = token ? await verifyTrial(token, env.STRIPE_WEBHOOK_SECRET) : null;
      const email = searchParams.get("email") || "";

      if (claim?.typ === "trial") {
        return json(req, { entitled: true, source: "trial", until: new Date(claim.exp * 1000).toISOString() });
      }

      if (email) {
        const rec = await env.KV_ENTITLEMENTS.get(email, { type: "json" }) as { access_until: string } | null;
        if (rec && isFuture(rec.access_until)) {
          return json(req, { entitled: true, source: "stripe", until: rec.access_until });
        }
      }
      return json(req, { entitled: false });
    }

    // Stripe Checkout
    if (pathname === "/api/checkout" && req.method === "POST") {
      const { plan, email } = await req.json().catch(() => ({}));
      if (!["month","semester"].includes(plan)) return bad(req, "plan must be month|semester");
      if (!email) return bad(req, "email required for checkout");

      const price = plan === "month" ? env.STRIPE_PRICE_MONTH : env.STRIPE_PRICE_SEMESTER;
      const body = formBody({
        "mode": "subscription",
        "success_url": `${env.APP_URL}/?purchased=1`,
        "cancel_url": `${env.APP_URL}/?canceled=1`,
        "customer_email": email,
        "allow_promotion_codes": "true",
        "line_items[0][price]": price,
        "line_items[0][quantity]": "1"
      });

      const r = await stripeFetch(env, "/v1/checkout/sessions", { method: "POST", body });
      const js = await r.json();
      if (!r.ok) return json(req, js, { status: 500 });
      return json(req, { url: js.url });
    }

    // Billing Portal (optional)
    if (pathname === "/api/portal" && req.method === "POST") {
      const { email } = await req.json().catch(() => ({}));
      if (!email) return bad(req, "email required");
      // Find customer by email
      const search = await stripeFetch(env, `/v1/customers/search?query=email:'${encodeURIComponent(email)}'`, { method: "GET", headers: { Authorization: `Bearer ${env.STRIPE_SECRET}` }});
      const sc = await search.json();
      if (!sc.data?.length) return bad(req, "Customer not found", 404);

      const body = formBody({
        customer: sc.data[0].id,
        return_url: env.APP_URL
      });
      const r = await stripeFetch(env, "/v1/billing_portal/sessions", { method: "POST", body });
      const js = await r.json();
      if (!r.ok) return json(req, js, { status: 500 });
      return json(req, { url: js.url });
    }

    // Stripe webhook (grant/revoke access)
    if (pathname === "/api/stripe/webhook" && req.method === "POST") {
      const raw = await req.arrayBuffer();
      const ok = await verifyStripeSignature(env, req, raw);
      if (!ok) return new Response("Bad signature", { status: 400 });

      const event = JSON.parse(new TextDecoder().decode(raw));
      try {
        if (event.type === "checkout.session.completed") {
          const s = event.data.object;
          if (s.mode === "subscription") {
            // fetch subscription to know which price
            const subId = s.subscription;
            const sub = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
              headers: { Authorization: `Bearer ${env.STRIPE_SECRET}` }
            }).then(r=>r.json());
            const email = s.customer_details?.email as string;
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
          const cust = await fetch(`https://api.stripe.com/v1/customers/${sub.customer}`, {
            headers: { Authorization: `Bearer ${env.STRIPE_SECRET}` }
          }).then(r=>r.json());
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
          const cust = await fetch(`https://api.stripe.com/v1/customers/${sub.customer}`, {
            headers: { Authorization: `Bearer ${env.STRIPE_SECRET}` }
          }).then(r=>r.json());
          await env.KV_ENTITLEMENTS.delete(cust.email);
        }
      } catch (e) {
        return new Response("Webhook handling error", { status: 500 });
      }
      return new Response("ok", { status: 200 });
    }

    // Correct (OpenAI)
    if (pathname === "/api/correct" && req.method === "POST") {
      const { level, task, essay } = await req.json().catch(() => ({}));
      if (!["B2","C1","C2"].includes(level)) return bad(req, "Invalid level");
      if (!essay) return bad(req, "Missing essay");
      const wc = (essay.trim().match(/\S+/g) || []).length;

      try {
        const { feedback, edits, nextDraft } = await callOpenAI(env, level, task || "", essay);
        return json(req, {
          level,
          inputWords: wc,
          outputWords: (nextDraft.trim().match(/\S+/g) || []).length,
          feedback,
          edits,
          nextDraft
        });
      } catch (e: any) {
        return json(req, { error: e?.message || "OpenAI error" }, { status: 500 });
      }
    }

    // CORS preflight fall-through
    if (req.method === "OPTIONS") return okOptions(req);
    return new Response("Not found", { status: 404 });
  }
};
