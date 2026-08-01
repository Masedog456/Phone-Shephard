import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, adminClient } = await requireUser(req);
    const { assetId, action } = (await req.json()) as { assetId: string; action: string };

    const status = action === "archive" ? "archived" : action === "delete" ? "deleted_pending" : "active";

    const { data: asset, error: fetchError } = await adminClient
      .from("media_assets")
      .select("id, status, file_size_bytes")
      .eq("user_id", user.id)
      .eq("device_asset_id", assetId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const { error: updateError } = await adminClient
      .from("media_assets")
      .update({ status })
      .eq("id", asset.id)
      .eq("user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    await adminClient.from("review_actions").insert({
      user_id: user.id,
      asset_id: asset.id,
      action,
      previous_status: asset.status,
      new_status: status,
      storage_saved_bytes: status === "deleted_pending" ? asset.file_size_bytes ?? 0 : 0
    });

    return jsonResponse({ ok: true, status });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
