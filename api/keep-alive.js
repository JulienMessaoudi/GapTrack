export default {
  async fetch(request) {
    const authHeader = request.headers.get("authorization");
    const secret = authHeader?.replace("Bearer ", "");

    if (secret !== process.env.CRON_SECRET) {
      return Response.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        { ok: false, error: "Missing environment variables" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/healthcheck?id=eq.1`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      return Response.json(
        {
          ok: false,
          status: response.status,
          error: errorText,
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    return Response.json({
      ok: true,
      message: "Supabase pinged successfully",
      data,
      date: new Date().toISOString(),
    });
  },
};
