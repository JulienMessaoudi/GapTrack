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

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase environment variables" }, 500);
  }

  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "").trim();
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return json({ error: "Invalid token" }, 400);
  }

  const tokenHash = await sha256Hex(token);
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: deletionRequest, error: requestError } = await admin
    .from("gaptrack_account_deletion_requests")
    .select("id, user_id, email, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (requestError || !deletionRequest) {
    return json({ error: "Invalid, expired, or already used token" }, 400);
  }

  const userId = String(deletionRequest.user_id);
  const email = String(deletionRequest.email || "");

  const { error: markUsedError } = await admin
    .from("gaptrack_account_deletion_requests")
    .update({ used_at: new Date().toISOString() })
    .eq("id", deletionRequest.id)
    .is("used_at", null);

  if (markUsedError) {
    console.error(markUsedError);
    return json({ error: "Unable to lock deletion request" }, 500);
  }

  const { data: evidenceRows, error: evidenceSelectError } = await admin
    .from("gaptrack_evidence_files")
    .select("storage_path")
    .eq("owner_user_id", userId);

  if (evidenceSelectError) {
    console.error(evidenceSelectError);
    return json({ error: "Unable to list evidence files" }, 500);
  }

  const storagePaths = (evidenceRows || [])
    .map((row: { storage_path?: string | null }) => row.storage_path)
    .filter((path: string | null | undefined): path is string => Boolean(path));

  for (let i = 0; i < storagePaths.length; i += 100) {
    const batch = storagePaths.slice(i, i + 100);
    if (!batch.length) continue;
    const { error: storageError } = await admin.storage.from("gaptrack-evidence").remove(batch);
    if (storageError) {
      console.error(storageError);
      return json({ error: "Unable to remove evidence files from Storage" }, 500);
    }
  }

  const cleanupSteps = [
    admin.from("gaptrack_evidence_files").delete().eq("owner_user_id", userId),
    admin.from("gaptrack_audit_sessions").delete().eq("owner_user_id", userId),
    admin.from("gaptrack_profiles").delete().eq("id", userId),
  ];

  for (const step of cleanupSteps) {
    const { error } = await step;
    if (error) {
      console.error(error);
      return json({ error: "Unable to delete server-side account data" }, 500);
    }
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    console.error(authDeleteError);
    return json({ error: "Unable to delete authentication user" }, 500);
  }

  return json({ ok: true, email });
});
