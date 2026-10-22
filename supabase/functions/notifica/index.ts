// Ape Attiva · invio notifiche push ai dispositivi dell'amministratore
// Chiamata da: trigger database (header x-hook-secret) oppure dal CRM per la notifica di prova (JWT admin)
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const SITO = "https://eddynaudo.github.io/ApeAttiva/";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

let cfg: Record<string, string> | null = null;
async function config() {
  if (!cfg) {
    const { data, error } = await sb.rpc("config_push");
    if (error) throw error;
    cfg = data as Record<string, string>;
    webpush.setVapidDetails("mailto:info@apeattiva.it", cfg.vapid_public, cfg.vapid_private);
  }
  return cfg;
}

const taglia = (s: unknown, n: number) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
};
const PAGINE: Record<string, string> = { "/": "Home", "/index.html": "Home", "/terreni.html": "Terreni", "/esterni.html": "Pavimentazioni e legno", "/giardini.html": "Giardini" };

function messaggio(tipo: string, r: Record<string, unknown>) {
  if (tipo === "richieste") {
    const dove = [r.servizio, r.localita].filter(Boolean).map((x) => taglia(x, 60)).join(" · ");
    return {
      pref: "notifica_richieste",
      title: `Nuova richiesta da ${taglia(r.nome, 40)}`,
      body: `${dove ? dove + "\n" : ""}${taglia(r.messaggio, 140)}`,
      url: `${SITO}admin.html#richieste`,
      tag: `richiesta-${r.id}`,
    };
  }
  if (tipo === "eventi") {
    const cosa = r.tipo === "click_whatsapp" ? "ha aperto WhatsApp" : "ha cliccato su Chiama";
    return {
      pref: "notifica_contatti",
      title: "Un visitatore ti sta contattando",
      body: `Dal sito, pagina ${PAGINE[String(r.path)] ?? r.path ?? ""}: ${cosa}.`,
      url: `${SITO}admin.html#statistiche`,
      tag: `contatto-${r.session_id}`,
    };
  }
  return {
    pref: null,
    title: "Notifiche attive ✓",
    body: "Da ora riceverai qui gli avvisi delle nuove richieste di preventivo.",
    url: `${SITO}admin.html#impostazioni`,
    tag: "prova",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "metodo non consentito" }, 405);
  try {
    const c = await config();
    const body = await req.json().catch(() => ({}));
    let tipo = String(body.tipo ?? "");
    const record = (body.record ?? {}) as Record<string, unknown>;
    let soloUtente: string | null = null;

    const hook = req.headers.get("x-hook-secret");
    if (hook) {
      if (hook !== c.push_hook_secret) return json({ error: "non autorizzato" }, 401);
      if (tipo === "eventi") {
        // un solo avviso per visitatore ogni 15 minuti
        const da = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { count } = await sb.from("eventi").select("id", { count: "exact", head: true })
          .eq("session_id", String(record.session_id)).in("tipo", ["click_telefono", "click_whatsapp"]).gte("created_at", da);
        if ((count ?? 0) > 1) return json({ saltato: "già notificato" });
      }
    } else {
      const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      const { data: u } = await sb.auth.getUser(jwt);
      if (!u?.user) return json({ error: "non autorizzato" }, 401);
      const { data: adm } = await sb.from("admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
      if (!adm) return json({ error: "non autorizzato" }, 403);
      tipo = "prova";
      soloUtente = u.user.id;
    }

    const m = messaggio(tipo, record);
    let q = sb.from("push_iscrizioni").select("*");
    if (m.pref) q = q.eq(m.pref, true);
    if (soloUtente) q = q.eq("user_id", soloUtente);
    const { data: subs, error } = await q;
    if (error) throw error;

    const payload = JSON.stringify({ title: m.title, body: m.body, url: m.url, tag: m.tag });
    const esiti = await Promise.allSettled((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24, urgency: "high" });
        await sb.from("push_iscrizioni").update({ ultimo_invio: new Date().toISOString() }).eq("id", s.id);
      } catch (e) {
        const st = (e as { statusCode?: number }).statusCode;
        if (st === 404 || st === 410) await sb.from("push_iscrizioni").delete().eq("id", s.id); // iscrizione scaduta
        throw e;
      }
    }));
    const inviate = esiti.filter((e) => e.status === "fulfilled").length;
    const errori = esiti.filter((e) => e.status === "rejected").map((e) => String((e as PromiseRejectedResult).reason?.body ?? (e as PromiseRejectedResult).reason));
    if (errori.length) console.error("push falliti", errori);
    return json({ inviate, fallite: errori.length, dispositivi: subs?.length ?? 0 });
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
