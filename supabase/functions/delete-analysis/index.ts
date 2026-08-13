import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { deleteScreenshotAnalysis } from "../_shared/deleteScreenshotAnalysis.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, adminClient } = await requireUser(req);

    const outcome = await deleteScreenshotAnalysis(adminClient, user.id);

    if (!outcome.ok) {
      console.error("delete-analysis incomplete", user.id, outcome.error, outcome.steps);
      // A partial deletion is a failure, not a success. Reporting ok:true here would tell the
      // user their analysis was removed while some of it is still stored.
      return jsonResponse(
        {
          ok: false,
          error: outcome.error ?? "Some analysis data could not be deleted.",
          steps: outcome.steps,
          retained: outcome.retained
        },
        500
      );
    }

    return jsonResponse({ ok: true, steps: outcome.steps, retained: outcome.retained });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
