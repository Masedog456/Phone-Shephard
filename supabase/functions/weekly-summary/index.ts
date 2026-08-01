import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, adminClient } = await requireUser(req);
    const weekStart = getWeekStart();

    const { count: screenshotsSaved } = await adminClient
      .from("media_assets")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("asset_type", "screenshot")
      .gte("imported_at", weekStart);

    const { count: reviewedCount } = await adminClient
      .from("review_actions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", weekStart);

    const { data, error } = await adminClient
      .from("weekly_summaries")
      .upsert(
        {
          user_id: user.id,
          week_start: weekStart.slice(0, 10),
          screenshots_saved: screenshotsSaved ?? 0,
          reviewed_count: reviewedCount ?? 0,
          suggested_review_count: Math.max((screenshotsSaved ?? 0) - (reviewedCount ?? 0), 0),
          summary_json: {
            tone: "calm",
            next_best_action: "Review recent screenshots"
          }
        },
        { onConflict: "user_id,week_start" }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return jsonResponse({ summary: data });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function getWeekStart() {
  const date = new Date();
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day;
  date.setUTCDate(diff);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}
