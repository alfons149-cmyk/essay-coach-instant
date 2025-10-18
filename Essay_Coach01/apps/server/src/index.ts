import { correctionRequestSchema } from "./schema";
import { runPipeline } from "./pipeline";

export default {
  async fetch(request: Request, env: Record<string, string>) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": env.CORS_ORIGIN || "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (url.pathname === "/api/health") {
      return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
        headers: { "Content-Type": "application/json", ...cors }
      });
    }

    if (url.pathname === "/api/correct" && request.method === "POST") {
      let reqJson: unknown;
      try {
        reqJson = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...cors }
        });
      }

      const parsed = correctionRequestSchema.safeParse(reqJson);
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: "Bad request", details: parsed.error.flatten() }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...cors }
        });
      }

      const result = await runPipeline(parsed.data);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", ...cors }
      });
    }

    return new Response("Not Found", { status: 404, headers: cors });
  }
};
