export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // CORS (adjust origin to your site when ready)
    const withCors = (r: Response, origin = "*") => {
      r.headers.set("access-control-allow-origin", origin);
      r.headers.set("access-control-allow-headers", "content-type");
      r.headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
      return r;
    };
    if (req.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));

    if (url.pathname === "/ping") {
      return withCors(new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
        headers: { "content-type": "application/json" }
      }));
    }

    if (url.pathname === "/api/correct" && req.method === "POST") {
      try {
        const body = await req.json().catch(() => ({}));
        const text  = String(body.text || "");
        const level = String(body.level || "C1");
        const out = text.replace(/\s+/g, " ").trim();

        return withCors(new Response(JSON.stringify({
          corrected: out || text,
          notes: out !== text ? ["Normalized whitespace."] : [],
          replacements: [],
          alternatives: {}
        }), { headers: { "content-type": "application/json" }}));
      } catch (e: any) {
        return withCors(new Response(JSON.stringify({ error: e?.message || "failed" }), {
          status: 400, headers: { "content-type": "application/json" }
        }));
      }
    }

    // Optional home page so root URL works
    if (url.pathname === "/") {
      return withCors(new Response("EssayCoach Worker OK. Try /ping or POST /api/correct\n", {
        headers: { "content-type": "text/plain" }
      }));
    }

    return withCors(new Response("Not found", { status: 404 }));
  }
} satisfies ExportedHandler;
