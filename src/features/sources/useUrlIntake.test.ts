const mockIngestUrl = jest.fn();
const mockSaveUserNote = jest.fn();
const mockRefresh = jest.fn();

jest.mock("@/lib/supabase", () => ({ isDemoMode: true, isSupabaseConfigured: false, supabase: {} }));

jest.mock("@/lib/api", () => ({
  ingestUrl: (...args: unknown[]) => mockIngestUrl(...args),
  saveUserNote: (...args: unknown[]) => mockSaveUserNote(...args)
}));

jest.mock("@/features/library/useLibraryItems", () => ({
  useLibraryItems: { getState: () => ({ refresh: mockRefresh }) }
}));

import { useUrlIntake } from "@/features/sources/useUrlIntake";

const result = {
  item: { id: "src-1", title: "How to Braise Anything", extractedText: "collagen" },
  duplicateStatus: "new" as const,
  duplicateOfId: null,
  extractionStatus: "extracted" as const,
  wordCount: 320
};

beforeEach(() => {
  mockIngestUrl.mockReset();
  mockSaveUserNote.mockReset();
  mockRefresh.mockReset();
  useUrlIntake.getState().reset();
});

describe("submit", () => {
  it("moves through fetching to ready and keeps the result", async () => {
    mockIngestUrl.mockResolvedValue(result);

    const returned = await useUrlIntake.getState().submit("https://x.example/a");

    expect(returned?.item.id).toBe("src-1");
    expect(useUrlIntake.getState().phase).toBe("ready");
    expect(useUrlIntake.getState().result?.duplicateStatus).toBe("new");
  });

  it("refreshes the Library so the new source appears", async () => {
    mockIngestUrl.mockResolvedValue(result);
    await useUrlIntake.getState().submit("https://x.example/a");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("records a failure with its reason instead of throwing at the screen", async () => {
    mockIngestUrl.mockRejectedValue(
      Object.assign(new Error("That page needs a login."), { reason: "http_error", retryable: false, itemId: "src-9" })
    );

    const returned = await useUrlIntake.getState().submit("https://paywall.example/a");

    expect(returned).toBeNull();
    expect(useUrlIntake.getState().phase).toBe("failed");
    expect(useUrlIntake.getState().failure).toEqual({
      reason: "http_error",
      message: "That page needs a login.",
      retryable: false,
      itemId: "src-9"
    });
  });

  it("still refreshes the Library when a failed fetch was recorded server-side", async () => {
    mockIngestUrl.mockRejectedValue(Object.assign(new Error("blocked"), { itemId: "src-9" }));
    await useUrlIntake.getState().submit("https://x.example/a");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("clears a previous failure when a new submission starts", async () => {
    mockIngestUrl.mockRejectedValueOnce(new Error("nope"));
    await useUrlIntake.getState().submit("https://x.example/bad");
    expect(useUrlIntake.getState().failure).not.toBeNull();

    mockIngestUrl.mockResolvedValue(result);
    await useUrlIntake.getState().submit("https://x.example/good");
    expect(useUrlIntake.getState().failure).toBeNull();
  });
});

describe("attachNote", () => {
  it("saves the user's note through the API and reflects it locally", async () => {
    mockIngestUrl.mockResolvedValue(result);
    await useUrlIntake.getState().submit("https://x.example/a");

    await useUrlIntake.getState().attachNote("src-1", "Try with short ribs");

    expect(mockSaveUserNote).toHaveBeenCalledWith("src-1", "Try with short ribs");
    expect(useUrlIntake.getState().result?.item.userNote).toBe("Try with short ribs");
  });

  it("never writes the note into the AI summary field", async () => {
    mockIngestUrl.mockResolvedValue(result);
    await useUrlIntake.getState().submit("https://x.example/a");
    await useUrlIntake.getState().attachNote("src-1", "my own thought");

    const item = useUrlIntake.getState().result?.item as Record<string, unknown>;
    expect(item.userNote).toBe("my own thought");
    expect(item.aiSummary).toBeUndefined();
  });
});
