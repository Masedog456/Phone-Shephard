import { deleteScreenshotAnalysis, DeletionClient, RETAINED_TABLES } from "./deleteScreenshotAnalysis";

type Call = { table: string; op: "delete" | "update"; column: string; value: string; values?: Record<string, unknown> };

/**
 * Fake client that records every statement, so tests can assert both what was touched and
 * that every statement was scoped to a single user.
 */
function fakeClient(failures: Record<string, string> = {}) {
  const calls: Call[] = [];
  const client: DeletionClient = {
    from(table: string) {
      return {
        delete: () => ({
          eq: async (column: string, value: string) => {
            calls.push({ table, op: "delete", column, value });
            return { error: failures[table] ? { message: failures[table] } : null };
          }
        }),
        update: (values: Record<string, unknown>) => ({
          eq: async (column: string, value: string) => {
            calls.push({ table, op: "update", column, value, values });
            return { error: failures[table] ? { message: failures[table] } : null };
          }
        })
      };
    }
  };
  return { client, calls };
}

describe("deleteScreenshotAnalysis", () => {
  it("removes exactly the screenshot analysis tables", async () => {
    const { client, calls } = fakeClient();
    const outcome = await deleteScreenshotAnalysis(client, "user-a");

    expect(outcome.ok).toBe(true);
    const deleted = calls.filter((call) => call.op === "delete").map((call) => call.table);
    expect(deleted).toEqual(["asset_embeddings", "asset_ai_analysis"]);
  });

  it("resets the derived sensitivity flag without deleting the screenshots", async () => {
    const { client, calls } = fakeClient();
    await deleteScreenshotAnalysis(client, "user-a");

    const mediaCalls = calls.filter((call) => call.table === "media_assets");
    expect(mediaCalls).toHaveLength(1);
    expect(mediaCalls[0].op).toBe("update");
    expect(mediaCalls[0].values).toEqual({ is_sensitive: false });
    expect(calls.some((call) => call.table === "media_assets" && call.op === "delete")).toBe(false);
  });

  // The retention half of the promise: these must never be touched by this action.
  it.each(["library_items", "transformations", "transformation_feedback", "shepherd_reminders", "review_actions"])(
    "never touches %s",
    async (table) => {
      const { client, calls } = fakeClient();
      await deleteScreenshotAnalysis(client, "user-a");
      expect(calls.some((call) => call.table === table)).toBe(false);
    }
  );

  it("reports the retained tables so the promise is auditable", async () => {
    const { client } = fakeClient();
    const outcome = await deleteScreenshotAnalysis(client, "user-a");
    expect(outcome.retained).toEqual(RETAINED_TABLES);
    expect(outcome.retained).toEqual(expect.arrayContaining(["library_items", "transformations", "shepherd_reminders"]));
  });

  it("scopes every statement to the calling user so User A cannot affect User B", async () => {
    const { client, calls } = fakeClient();
    await deleteScreenshotAnalysis(client, "user-a");

    expect(calls).not.toHaveLength(0);
    for (const call of calls) {
      expect(call.column).toBe("user_id");
      expect(call.value).toBe("user-a");
    }
  });

  it("refuses to run without a user id", async () => {
    const { client, calls } = fakeClient();
    const outcome = await deleteScreenshotAnalysis(client, "");

    expect(outcome.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("reports failure — not success — when the first step fails", async () => {
    const { client, calls } = fakeClient({ asset_embeddings: "connection reset" });
    const outcome = await deleteScreenshotAnalysis(client, "user-a");

    expect(outcome.ok).toBe(false);
    expect(outcome.error).toContain("connection reset");
    // Aborts rather than continuing past a failed step.
    expect(calls.map((call) => call.table)).toEqual(["asset_embeddings"]);
  });

  it("reports partial failure honestly when a later step fails", async () => {
    const { client } = fakeClient({ asset_ai_analysis: "deadlock detected" });
    const outcome = await deleteScreenshotAnalysis(client, "user-a");

    expect(outcome.ok).toBe(false);
    expect(outcome.error).toContain("deadlock detected");
    // Says what did happen instead of implying nothing was removed.
    expect(outcome.error).toContain("Semantic index was removed");
    expect(outcome.steps).toEqual([
      { table: "asset_embeddings", status: "completed" },
      { table: "asset_ai_analysis", status: "failed", error: "deadlock detected" }
    ]);
  });

  it("does not report success when only the sensitivity reset fails", async () => {
    const { client } = fakeClient({ media_assets: "permission denied" });
    const outcome = await deleteScreenshotAnalysis(client, "user-a");

    expect(outcome.ok).toBe(false);
    expect(outcome.error).toContain("permission denied");
  });
});
