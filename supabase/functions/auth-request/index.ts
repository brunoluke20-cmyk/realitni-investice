import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const projectUrl = Deno.env.get("SUPABASE_URL") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const allowedOrigin = "https://brunoluke20-cmyk.github.io";
const cors = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (origin && origin !== allowedOrigin) return json({ error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  if (!projectUrl || !anonKey || !serviceKey) return json({ error: "Auth služba není nakonfigurovaná." }, 503);

  let email = "";
  let redirectTo = "";
  try {
    const body = await req.json();
    email = String(body.email || "").trim().toLowerCase();
    redirectTo = String(body.redirectTo || "");
  } catch { return json({ error: "Neplatný požadavek." }, 400); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return json({ error: "Zadej platnou e-mailovou adresu." }, 400);
  }
  const expectedRedirect = "https://brunoluke20-cmyk.github.io/realitni-investice/lukrativita-okoli.html";
  if (redirectTo !== expectedRedirect) return json({ error: "Neplatná návratová adresa." }, 400);

  try {
    const lookup = await fetch(projectUrl + "/rest/v1/allowed_users?email=eq." + encodeURIComponent(email) + "&active=eq.true&select=email&limit=1", {
      headers: { "apikey": serviceKey, "Authorization": "Bearer " + serviceKey, "Accept": "application/json" },
      signal: AbortSignal.timeout(8000)
    });
    if (!lookup.ok) return json({ error: "Seznam povolených uživatelů není dostupný." }, 503);
    const rows = await lookup.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return json({ ok: true, message: "Pokud je adresa povolená, přijde na ni přihlašovací odkaz." });
    }
    const response = await fetch(projectUrl + "/auth/v1/otp?redirect_to=" + encodeURIComponent(redirectTo), {
      method: "POST",
      headers: { "apikey": anonKey, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ email, create_user: true }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return json({ error: "Přihlašovací e-mail se nepodařilo odeslat." }, 502);
    return json({ ok: true, message: "Pokud je adresa povolená, přijde na ni přihlašovací odkaz." });
  } catch {
    return json({ error: "Přihlašovací služba je dočasně nedostupná." }, 503);
  }
});
