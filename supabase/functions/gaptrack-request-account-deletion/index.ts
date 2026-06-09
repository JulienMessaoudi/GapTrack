import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[char] || char));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL") || req.headers.get("origin") || "";
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const mailFrom = Deno.env.get("DELETE_ACCOUNT_MAIL_FROM") || "GapTrack <noreply@example.com>";

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json({ error: "Missing Supabase environment variables" }, 500);
  }

  if (!resendApiKey) {
    return json({ error: "Missing RESEND_API_KEY. Configure an email provider before enabling account deletion." }, 500);
  }

  const authorization = req.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user?.id || !authData.user.email) {
    return json({ error: "Not authenticated" }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const requestedEmail = normalizeEmail(body.email);
  const userEmail = normalizeEmail(authData.user.email);

  if (requestedEmail !== userEmail) {
    return json({ error: "Email does not match the authenticated user" }, 403);
  }

  const token = createToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const validationLink = `${publicSiteUrl.replace(/\/$/, "")}/app?gaptrack_delete_token=${encodeURIComponent(token)}`;

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { error: insertError } = await admin.from("gaptrack_account_deletion_requests").insert({
    user_id: authData.user.id,
    email: userEmail,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_ip: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  if (insertError) {
    console.error(insertError);
    return json({ error: "Unable to create deletion request" }, 500);
  }

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a">
      <h2>Validation de suppression du compte GapTrack</h2>
      <p>Une demande de suppression définitive a été initiée pour le compte <strong>${escapeHtml(userEmail)}</strong>.</p>
      <p>Pour confirmer la suppression du compte et des données serveur associées, cliquez sur le bouton ci-dessous. Le lien expire dans 30 minutes.</p>
      <p><a href="${escapeHtml(validationLink)}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Confirmer la suppression</a></p>
      <p>Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>
    </div>
  `;

  const mailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: mailFrom,
      to: userEmail,
      subject: "Confirmer la suppression de votre compte GapTrack",
      html,
    }),
  });

  if (!mailResponse.ok) {
    const details = await mailResponse.text().catch(() => "");
    console.error("Email provider error", details);
    return json({ error: "Unable to send validation email" }, 500);
  }

  return json({ ok: true, email: userEmail, expires_at: expiresAt });
});
