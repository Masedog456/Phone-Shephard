/**
 * Screenshot AI analysis deletion.
 *
 * Scope is deliberately narrow and matches the user-facing control exactly: this removes the
 * AI analysis Phone Shepherd derived from screenshots. It does NOT remove Library items,
 * transformations, transformation feedback, reminders, the screenshots themselves, or the
 * account. Those are separate concepts with no user-facing control today; deleting them here
 * would destroy data the user never asked to lose.
 *
 * See docs/privacy-deletion.md for the full behaviour contract.
 *
 * No Deno globals and no remote imports, so this module loads in the Edge Function runtime
 * and in the Node test runner.
 */

/** Minimal structural view of the supabase-js client, so tests can supply a fake. */
export type DeletionClient = {
  from: (table: string) => {
    delete: () => { eq: (column: string, value: string) => Promise<{ error: { message: string } | null }> };
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

export type DeletionStep = { table: string; status: "completed" | "failed"; error?: string };

export type DeletionOutcome = {
  ok: boolean;
  steps: DeletionStep[];
  /** Tables this operation intentionally leaves untouched, surfaced for auditability. */
  retained: string[];
  error?: string;
};

/**
 * Tables that hold user data this operation intentionally preserves. Kept explicit so the
 * retention promise is reviewable in code rather than implied by omission.
 */
export const RETAINED_TABLES = [
  "media_assets",
  "library_items",
  "transformations",
  "transformation_feedback",
  "shepherd_reminders",
  "review_actions",
  "weekly_summaries",
  "user_settings"
];

/**
 * Deletes the caller's screenshot AI analysis.
 *
 * Every statement is scoped by `user_id`, so one user's deletion can never reach another's
 * rows even though a service-role client is used. Steps run in dependency-safe order and the
 * first failure aborts, because reporting success after a partial deletion would tell the user
 * their data is gone when it is not.
 */
export async function deleteScreenshotAnalysis(client: DeletionClient, userId: string): Promise<DeletionOutcome> {
  const steps: DeletionStep[] = [];

  if (!userId) {
    return { ok: false, steps, retained: RETAINED_TABLES, error: "A user id is required to delete analysis data." };
  }

  // asset_embeddings first: it is the derived semantic index over asset_ai_analysis, so
  // removing it first never leaves an index pointing at analysis rows that are already gone.
  const embeddings = await client.from("asset_embeddings").delete().eq("user_id", userId);
  if (embeddings.error) {
    steps.push({ table: "asset_embeddings", status: "failed", error: embeddings.error.message });
    return {
      ok: false,
      steps,
      retained: RETAINED_TABLES,
      error: `Could not delete semantic index: ${embeddings.error.message}`
    };
  }
  steps.push({ table: "asset_embeddings", status: "completed" });

  const analysis = await client.from("asset_ai_analysis").delete().eq("user_id", userId);
  if (analysis.error) {
    steps.push({ table: "asset_ai_analysis", status: "failed", error: analysis.error.message });
    return {
      ok: false,
      steps,
      retained: RETAINED_TABLES,
      // The embeddings delete already succeeded. Say so rather than implying nothing happened.
      error: `Semantic index was removed, but the analysis records could not be deleted: ${analysis.error.message}`
    };
  }
  steps.push({ table: "asset_ai_analysis", status: "completed" });

  // is_sensitive is a conclusion derived from the analysis being deleted, so it is reset rather
  // than left behind as a stale judgement about the user's screenshots.
  const sensitivity = await client.from("media_assets").update({ is_sensitive: false }).eq("user_id", userId);
  if (sensitivity.error) {
    steps.push({ table: "media_assets", status: "failed", error: sensitivity.error.message });
    return {
      ok: false,
      steps,
      retained: RETAINED_TABLES,
      error: `Analysis was deleted, but the sensitivity flags could not be reset: ${sensitivity.error.message}`
    };
  }
  steps.push({ table: "media_assets", status: "completed" });

  return { ok: true, steps, retained: RETAINED_TABLES };
}
