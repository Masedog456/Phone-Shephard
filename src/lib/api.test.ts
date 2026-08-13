import type { CapturedContent, LibraryItem } from "@/types/domain";

const mockConfig = { isDemoMode: true, isSupabaseConfigured: false };
const mockInvoke = jest.fn();

jest.mock("@/lib/supabase", () => ({
  get isDemoMode() {
    return mockConfig.isDemoMode;
  },
  get isSupabaseConfigured() {
    return mockConfig.isSupabaseConfigured;
  },
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    from: jest.fn()
  }
}));

jest.mock("expo-file-system", () => ({ readAsStringAsync: jest.fn(), EncodingType: { Base64: "base64" } }));
jest.mock("expo-image-manipulator", () => ({ manipulateAsync: jest.fn(), SaveFormat: { JPEG: "jpeg" } }));

import { createTransformation, createTransformationFromLibraryItem } from "@/lib/api";

const capture: CapturedContent = {
  id: "capture-test-1",
  title: "Sheet pan chicken",
  source: "safari",
  sourceLabel: "Web",
  capturedAt: "2026-08-01T12:00:00.000Z",
  contentType: "website",
  summary: "A weeknight recipe worth keeping.",
  keywords: ["recipe", "dinner"],
  suggestedShepherd: "Recipe Shepherd",
  suggestedShepherdId: "task-screenshots-recipes",
  preview: "Found something worth remembering.",
  recommendedAction: "add_to_shepherd"
};

const libraryItem: LibraryItem = {
  id: "lib-1",
  source: "Safari",
  contentType: "website",
  type: "Website",
  title: "Sheet pan chicken",
  aiSummary: "A weeknight recipe worth keeping.",
  whySaved: "Looked easy",
  suggestedAction: "Would you like to add this to a meal plan?",
  category: "recipes",
  collection: "Captured by Shepherd",
  capturedAt: "2026-08-01T12:00:00.000Z",
  keywords: ["recipe"],
  status: "active"
};

beforeEach(() => {
  mockInvoke.mockReset();
  mockConfig.isDemoMode = true;
  mockConfig.isSupabaseConfigured = false;
});

describe("createTransformation", () => {
  // The reported defect: EXPO_PUBLIC_DEMO_MODE defaults to true, and this call had no guard.
  it("returns a demo result without calling the backend in the default configuration", async () => {
    const result = await createTransformation(capture, "create_action_item");

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.id).toBe("demo-capture-test-1");
    expect(result.title).toBeTruthy();
    expect(result.sections.length).toBeGreaterThan(0);
  });

  it("produces a stable id so the result can be looked up by the transformation screen", async () => {
    const first = await createTransformation(capture, "create_action_item");
    const second = await createTransformation(capture, "create_action_item");
    expect(first.id).toBe(second.id);
  });

  it("calls the Edge Function when Supabase is configured", async () => {
    mockConfig.isDemoMode = false;
    mockConfig.isSupabaseConfigured = true;
    mockInvoke.mockResolvedValue({ data: { transformation: { id: "server-1", title: "Server made this" } }, error: null });

    const result = await createTransformation(capture, "summarize");

    expect(mockInvoke).toHaveBeenCalledWith("transform-capture", { body: { capture, action: "summarize" } });
    expect(result.id).toBe("server-1");
  });

  it("throws when the Edge Function fails in production", async () => {
    mockConfig.isDemoMode = false;
    mockConfig.isSupabaseConfigured = true;
    mockInvoke.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(createTransformation(capture, "summarize")).rejects.toThrow("boom");
  });
});

describe("createTransformationFromLibraryItem", () => {
  // This is the exact path behind the Library "Create" button.
  it("works in the default configuration without calling the backend", async () => {
    const result = await createTransformationFromLibraryItem(libraryItem);

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.id).toMatch(/^demo-library-lib-1/);
    expect(result.sections.length).toBeGreaterThan(0);
  });

  it("still reaches the backend when Supabase is configured", async () => {
    mockConfig.isDemoMode = false;
    mockConfig.isSupabaseConfigured = true;
    mockInvoke.mockResolvedValue({ data: { transformation: { id: "server-2" } }, error: null });

    const result = await createTransformationFromLibraryItem(libraryItem);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    const [functionName, payload] = mockInvoke.mock.calls[0] as [string, { body: { capture: CapturedContent } }];
    expect(functionName).toBe("transform-capture");
    // Provenance from the Library item must survive the conversion into a capture.
    expect(payload.body.capture.title).toBe("Sheet pan chicken");
    expect(result.id).toBe("server-2");
  });
});

describe("ingestUrl", () => {
  it("refuses in the default demo configuration rather than pretending to fetch", async () => {
    const { ingestUrl } = require("@/lib/api");
    await expect(ingestUrl("https://x.example/a")).rejects.toThrow(/private account/i);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("returns the mapped source when the function succeeds", async () => {
    mockConfig.isDemoMode = false;
    mockConfig.isSupabaseConfigured = true;
    mockInvoke.mockResolvedValue({
      data: {
        ok: true,
        item: {
          id: "src-1",
          title: "How to Braise Anything",
          source: "slowkitchen.example",
          content_type: "website",
          extracted_text: "collagen melts into gelatin",
          user_note: "try this",
          summary: "",
          canonical_url: "https://slowkitchen.example/braise",
          extraction_status: "extracted",
          captured_at: "2026-08-01T10:00:00.000Z"
        },
        duplicateStatus: "new",
        extractionStatus: "extracted",
        wordCount: 300
      },
      error: null
    });

    const { ingestUrl } = require("@/lib/api");
    const result = await ingestUrl("https://slowkitchen.example/braise", "try this");

    expect(mockInvoke).toHaveBeenCalledWith("ingest-url", { body: { url: "https://slowkitchen.example/braise", note: "try this" } });
    // The four provenance channels stay separate through the mapping.
    expect(result.item.extractedText).toBe("collagen melts into gelatin");
    expect(result.item.userNote).toBe("try this");
    expect(result.item.aiSummary).toBe("");
    expect(result.item.canonicalUrl).toBe("https://slowkitchen.example/braise");
    expect(result.duplicateStatus).toBe("new");
  });

  it("surfaces the server's reason and retryability on failure", async () => {
    mockConfig.isDemoMode = false;
    mockConfig.isSupabaseConfigured = true;
    mockInvoke.mockResolvedValue({
      data: { ok: false, reason: "http_error", message: "That page needs a login.", retryable: false, itemId: "src-9" },
      error: null
    });

    const { ingestUrl } = require("@/lib/api");
    await expect(ingestUrl("https://paywall.example/a")).rejects.toMatchObject({
      message: "That page needs a login.",
      reason: "http_error",
      retryable: false,
      itemId: "src-9"
    });
  });

  it("never fabricates an AI summary from source text", async () => {
    mockConfig.isDemoMode = false;
    mockConfig.isSupabaseConfigured = true;
    mockInvoke.mockResolvedValue({
      data: { ok: true, item: { id: "s", title: "T", extracted_text: "source words", summary: "" }, duplicateStatus: "new" },
      error: null
    });

    const { ingestUrl } = require("@/lib/api");
    const result = await ingestUrl("https://x.example/a");
    expect(result.item.aiSummary).toBe("");
    expect(result.item.aiSummary).not.toBe(result.item.extractedText);
  });
});
