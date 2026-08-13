import type { LibraryItem } from "@/types/domain";

const mockRefresh = jest.fn();
const mockCreateFromLibraryItem = jest.fn();
const mockCreateTransformation = jest.fn();
const mockFetchTransformation = jest.fn();

jest.mock("@/lib/supabase", () => ({ isDemoMode: true, isSupabaseConfigured: false, supabase: {} }));

jest.mock("@/lib/api", () => ({
  createTransformation: (...args: unknown[]) => mockCreateTransformation(...args),
  createTransformationFromLibraryItem: (...args: unknown[]) => mockCreateFromLibraryItem(...args),
  fetchTransformation: (...args: unknown[]) => mockFetchTransformation(...args),
  saveTransformation: jest.fn(),
  scheduleTransformationReminder: jest.fn(),
  submitTransformationFeedback: jest.fn()
}));

jest.mock("@/features/library/useLibraryItems", () => ({
  useLibraryItems: { getState: () => ({ refresh: mockRefresh }) }
}));

import { useTransformations } from "@/features/transformation/useTransformations";

const libraryItem = {
  id: "lib-1",
  source: "Safari",
  type: "Website",
  title: "Sheet pan chicken",
  aiSummary: "A weeknight recipe.",
  whySaved: "Looked easy",
  suggestedAction: "Add to a meal plan?",
  category: "recipes",
  collection: "Captured by Shepherd",
  capturedAt: "2026-08-01T12:00:00.000Z",
  keywords: ["recipe"],
  status: "active"
} as LibraryItem;

beforeEach(() => {
  mockRefresh.mockReset();
  mockCreateFromLibraryItem.mockReset();
  mockCreateTransformation.mockReset();
  useTransformations.setState({ isCreating: false, isLoading: false, error: null });
});

describe("createFromLibraryItem", () => {
  it("caches the result so the transformation screen can render it", async () => {
    mockCreateFromLibraryItem.mockResolvedValue({ id: "demo-library-lib-1", title: "Created" });

    const result = await useTransformations.getState().createFromLibraryItem(libraryItem);

    // The screen reads state.results[id]; a result created outside the store was invisible to it.
    expect(useTransformations.getState().results[result.id]).toBeDefined();
    expect(useTransformations.getState().results["demo-library-lib-1"].title).toBe("Created");
  });

  it("refreshes the Library so a newly created item appears", async () => {
    mockCreateFromLibraryItem.mockResolvedValue({ id: "demo-library-lib-1" });
    await useTransformations.getState().createFromLibraryItem(libraryItem);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("passes the default action through to the API layer", async () => {
    mockCreateFromLibraryItem.mockResolvedValue({ id: "x" });
    await useTransformations.getState().createFromLibraryItem(libraryItem);
    expect(mockCreateFromLibraryItem).toHaveBeenCalledWith(libraryItem, "create_action_item");
  });

  it("clears the creating flag even when the API call fails", async () => {
    mockCreateFromLibraryItem.mockRejectedValue(new Error("nope"));

    await expect(useTransformations.getState().createFromLibraryItem(libraryItem)).rejects.toThrow("nope");
    expect(useTransformations.getState().isCreating).toBe(false);
  });
});

describe("createFromCapture", () => {
  it("delegates to the API layer rather than branching on demo mode itself", async () => {
    mockCreateTransformation.mockResolvedValue({ id: "demo-capture-1" });

    const result = await useTransformations.getState().createFromCapture(
      { id: "capture-1", suggestedShepherdId: "task-screenshots-recipes" } as never,
      "add_to_shepherd"
    );

    expect(mockCreateTransformation).toHaveBeenCalledTimes(1);
    expect(useTransformations.getState().results[result.id]).toBeDefined();
    expect(mockRefresh).toHaveBeenCalled();
  });
});

describe("loadById", () => {
  it("returns a cached result without hitting the network", async () => {
    useTransformations.setState({ results: { "demo-1": { id: "demo-1", title: "Cached" } as never } });

    const result = await useTransformations.getState().loadById("demo-1");

    expect(result?.title).toBe("Cached");
    expect(mockFetchTransformation).not.toHaveBeenCalled();
  });
});
