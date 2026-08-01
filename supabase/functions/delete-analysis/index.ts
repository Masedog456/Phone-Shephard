import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, adminClient } = await requireUser(req);

    await adminClient.from("asset_embeddings").delete().eq("user_id", user.id);
    await adminClient.from("asset_ai_analysis").delete().eq("user_id", user.id);
    await adminClient.from("media_assets").update({ is_sensitive: false }).eq("user_id", user.id);

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
