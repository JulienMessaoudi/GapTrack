import { createClient } from "npm:@supabase/supabase-js@^2";
import { corsHeaders as supabaseCorsHeaders } from "npm:@supabase/supabase-js@^2/cors";

type RequestType = "contact" | "premium" | "support" | "privacy";

type ContactPayload = {
  requestType?: unknown;
  name?: unknown;
  email?: unknown;
  organization?: unknown;
  needs?: unknown;
  context?: unknown;
  deadline?: unknown;
  source?: unknown;
  consent?: unknown;
  website?: unknown;
  startedAt?: unknown;
};

const REQUEST_TYPES = new Set<RequestType>(["contact", "premium", "support", "privacy"]);
const ALLOWED_NEEDS = new Set([
  "Audits illimités",
  "Exports PDF / CSV",
  "Stockage cloud des preuves",
  "Validation des preuves",
  "Utilisateurs et rôles avancés",
  "Modèles personnalisés",
  "Autre besoin",
]);

function allowedOrigins(): Set<string> {
  const configured = (Deno.env.get("CONTACT_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set([
    "https://gaptrack.fr",
    "https://www.gaptrack.fr",
    "http://localhost:4321",
    "http://localhost:3000",
    ...configured,
  ]);
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "https://gaptrack.fr";
  const allowed = allowedOrigins();
  return {
    ...supabaseCorsHeaders,
    "Access-Control-Allow-Origin": allowed.has(origin) ? origin : "https://gaptrack.fr",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders(req),
  });
}

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, maxLength);
}

function cleanEmail(value: unknown): string {
  return cleanText(value, 254).toLowerCase();
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function htmlLines(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function firstSecretKey(): string {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern);
      if (typeof parsed === "string") return parsed;
      if (parsed && typeof parsed === "object") {
        const preferred = parsed.default;
        if (typeof preferred === "string" && preferred) return preferred;
        const fallback = Object.values(parsed).find((item) => typeof item === "string" && item);
        if (typeof fallback === "string") return fallback;
      }
    } catch {
      if (modern.trim()) return modern.trim();
    }
  }

  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || "";
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requestLabel(type: RequestType): string {
  if (type === "premium") return "Demande Premium";
  if (type === "support") return "Demande d’assistance";
  if (type === "privacy") return "Demande relative aux données personnelles";
  return "Question générale";
}

function buildAdminHtml(params: {
  id: string;
  type: RequestType;
  name: string;
  email: string;
  organization: string;
  needs: string[];
  context: string;
  deadline: string;
  source: string;
}): string {
  const needs = params.needs.length
    ? params.needs.map((need) => `<li style="margin:0 0 7px;color:#cbd5e1;">${escapeHtml(need)}</li>`).join("")
    : '<li style="color:#64748b;">Aucune fonctionnalité sélectionnée</li>';

  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#030712;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#030712" style="width:100%;background:#030712;padding:42px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#07152d" style="width:100%;max-width:660px;background:#07152d;border:1px solid #1e4078;border-radius:18px;overflow:hidden;">
          <tr><td bgcolor="#0d2b5f" style="padding:30px 34px;background:#0d2b5f;border-bottom:1px solid #1e4078;">
            <div style="font-size:28px;font-weight:800;color:#fff;">GapTrack</div>
            <div style="margin-top:6px;color:#bfdbfe;font-size:14px;">Nouvelle demande reçue depuis le formulaire</div>
          </td></tr>
          <tr><td style="padding:34px;">
            <div style="display:inline-block;padding:7px 11px;border-radius:999px;background:#12356d;color:#93c5fd;font-size:12px;font-weight:700;">${escapeHtml(requestLabel(params.type).toUpperCase())}</div>
            <h1 style="margin:20px 0 26px;font-size:26px;color:#fff;">${escapeHtml(requestLabel(params.type))}</h1>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
              <tr><td style="padding:12px 0;color:#7f93b3;width:145px;border-bottom:1px solid #16305c;">Nom</td><td style="padding:12px 0;color:#fff;border-bottom:1px solid #16305c;"><strong>${escapeHtml(params.name)}</strong></td></tr>
              <tr><td style="padding:12px 0;color:#7f93b3;border-bottom:1px solid #16305c;">E-mail</td><td style="padding:12px 0;border-bottom:1px solid #16305c;"><a href="mailto:${escapeHtml(params.email)}" style="color:#60a5fa;">${escapeHtml(params.email)}</a></td></tr>
              <tr><td style="padding:12px 0;color:#7f93b3;border-bottom:1px solid #16305c;">Organisation</td><td style="padding:12px 0;color:#e2e8f0;border-bottom:1px solid #16305c;">${escapeHtml(params.organization || "Non renseignée")}</td></tr>
              <tr><td style="padding:12px 0;color:#7f93b3;border-bottom:1px solid #16305c;">Délai</td><td style="padding:12px 0;color:#e2e8f0;border-bottom:1px solid #16305c;">${escapeHtml(params.deadline || "Non renseigné")}</td></tr>
              <tr><td style="padding:12px 0;color:#7f93b3;">Origine</td><td style="padding:12px 0;color:#e2e8f0;">${escapeHtml(params.source || "Site GapTrack")}</td></tr>
            </table>

            ${params.type === "premium" ? `<div style="margin-top:28px;padding:20px;border-radius:12px;background:#091f43;border:1px solid #214e91;"><strong style="color:#bfdbfe;">Fonctionnalités recherchées</strong><ul style="margin:14px 0 0;padding-left:21px;">${needs}</ul></div>` : ""}

            <div style="margin-top:28px;padding:21px;border-radius:12px;background:#050f22;border:1px solid #183765;">
              <strong style="display:block;margin-bottom:12px;color:#93c5fd;">Message</strong>
              <div style="color:#dbe5f4;font-size:15px;line-height:1.7;">${htmlLines(params.context)}</div>
            </div>

            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;"><tr><td bgcolor="#2563eb" style="border-radius:10px;background:#2563eb;"><a href="mailto:${escapeHtml(params.email)}?subject=${encodeURIComponent(`Re: ${requestLabel(params.type)} GapTrack`)}" style="display:inline-block;padding:15px 24px;color:#fff;text-decoration:none;font-weight:700;">Répondre à ${escapeHtml(params.name)}</a></td></tr></table>
          </td></tr>
          <tr><td bgcolor="#050f22" style="padding:20px 34px;background:#050f22;border-top:1px solid #1e4078;color:#7183a4;font-size:12px;line-height:1.6;">Identifiant de la demande : ${escapeHtml(params.id)}<br>Cette demande est également sauvegardée dans Supabase.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(req, { ok: false, error: "Méthode non autorisée." }, 405);
  }

  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) {
    return json(req, { ok: false, error: "Origine non autorisée." }, 403);
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > 24_000) {
    return json(req, { ok: false, error: "La demande est trop volumineuse." }, 413);
  }

  let payload: ContactPayload;
  try {
    payload = await req.json();
  } catch {
    return json(req, { ok: false, error: "Corps JSON invalide." }, 400);
  }

  // Honeypot : on répond positivement sans stocker ni envoyer afin de ne pas aider les robots.
  if (cleanText(payload.website, 200)) {
    return json(req, { ok: true });
  }

  const requestType = cleanText(payload.requestType, 20) as RequestType;
  const name = cleanText(payload.name, 120);
  const email = cleanEmail(payload.email);
  const organization = cleanText(payload.organization, 160);
  const context = cleanText(payload.context, 4000);
  const deadline = cleanText(payload.deadline, 160);
  const source = cleanText(payload.source, 200) || "Site GapTrack";
  const startedAt = Number(payload.startedAt || 0);
  const consent = payload.consent === true;
  const needs = Array.isArray(payload.needs)
    ? Array.from(new Set(payload.needs.map((item) => cleanText(item, 80)).filter((item) => ALLOWED_NEEDS.has(item)))).slice(0, 10)
    : [];

  if (!REQUEST_TYPES.has(requestType)) return json(req, { ok: false, error: "Type de demande invalide." }, 400);
  if (name.length < 2) return json(req, { ok: false, error: "Nom invalide." }, 400);
  if (!validEmail(email)) return json(req, { ok: false, error: "Adresse e-mail invalide." }, 400);
  if (context.length < 10) return json(req, { ok: false, error: "Message trop court." }, 400);
  if (!consent) return json(req, { ok: false, error: "Consentement requis." }, 400);
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 1_500 || Date.now() - startedAt > 7_200_000) {
    return json(req, { ok: false, error: "Veuillez recharger le formulaire puis réessayer." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const secretKey = firstSecretKey();
  if (!supabaseUrl || !secretKey) {
    return json(req, { ok: false, error: "Configuration serveur Supabase incomplète." }, 500);
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ip = cleanText(req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("cf-connecting-ip") || "unknown", 100);
  const userAgent = cleanText(req.headers.get("user-agent"), 500);
  const fingerprint = await sha256(`${ip}|${userAgent}|gaptrack-contact-v1`);
  const since = new Date(Date.now() - 15 * 60_000).toISOString();

  const { count: recentCount, error: rateError } = await admin
    .from("gaptrack_contact_requests")
    .select("id", { count: "exact", head: true })
    .eq("request_fingerprint", fingerprint)
    .gte("created_at", since);

  if (rateError) {
    console.error("Unable to check GapTrack contact rate limit", rateError);
    return json(req, { ok: false, error: "Le formulaire est momentanément indisponible." }, 500);
  }
  if ((recentCount || 0) >= 4) {
    return json(req, { ok: false, error: "Trop de demandes ont été envoyées. Réessayez dans 15 minutes." }, 429);
  }

  const { data: inserted, error: insertError } = await admin
    .from("gaptrack_contact_requests")
    .insert({
      request_type: requestType,
      name,
      email,
      organization: organization || null,
      needs,
      context,
      deadline: deadline || null,
      source,
      request_fingerprint: fingerprint,
      user_agent: userAgent || null,
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    console.error("Unable to save GapTrack contact request", insertError);
    return json(req, { ok: false, error: "La demande n’a pas pu être enregistrée." }, 500);
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
  const toEmail = Deno.env.get("CONTACT_TO_EMAIL") || "contact@gaptrack.fr";
  const fromEmail = Deno.env.get("CONTACT_FROM_EMAIL") || "GapTrack <contact@gaptrack.fr>";

  if (!resendApiKey) {
    await admin.from("gaptrack_contact_requests").update({ email_error: "RESEND_API_KEY manquante" }).eq("id", inserted.id);
    return json(req, { ok: false, error: "L’envoi d’e-mail n’est pas encore configuré. La demande a néanmoins été enregistrée." }, 503);
  }

  const label = requestLabel(requestType);
  const text = [
    label,
    "",
    `Nom : ${name}`,
    `E-mail : ${email}`,
    `Organisation : ${organization || "Non renseignée"}`,
    `Délai : ${deadline || "Non renseigné"}`,
    `Origine : ${source}`,
    ...(requestType === "premium" ? ["", "Fonctionnalités :", ...needs.map((need) => `- ${need}`)] : []),
    "",
    "Message :",
    context,
    "",
    `Identifiant : ${inserted.id}`,
  ].join("\n");

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: email,
      subject: `[GapTrack] ${label} — ${name}`,
      html: buildAdminHtml({ id: inserted.id, type: requestType, name, email, organization, needs, context, deadline, source }),
      text,
    }),
  });

  const resendData = await resendResponse.json().catch(() => ({}));
  if (!resendResponse.ok) {
    const providerError = cleanText(resendData?.message || resendData?.error || `HTTP ${resendResponse.status}`, 1000);
    console.error("Resend rejected GapTrack contact email", providerError);
    await admin.from("gaptrack_contact_requests").update({ email_error: providerError }).eq("id", inserted.id);
    return json(req, { ok: false, error: "La demande a été enregistrée, mais l’e-mail n’a pas pu être envoyé." }, 502);
  }

  await admin
    .from("gaptrack_contact_requests")
    .update({
      email_sent_at: new Date().toISOString(),
      email_provider_id: cleanText(resendData?.id, 200) || null,
      email_error: null,
    })
    .eq("id", inserted.id);

  return json(req, { ok: true, requestId: inserted.id });
});
