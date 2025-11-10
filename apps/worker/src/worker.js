export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" || url.pathname === "/ping") {
      return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      });
    }

    // Default 404
    return new Response("Not Found", { status: 404 });
  }
};
