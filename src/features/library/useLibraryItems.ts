import { create } from "zustand";
import { archiveLibraryItem, fetchLibraryItems, updateLibraryItem } from "@/lib/api";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { LibraryItem, LibraryItemUpdate } from "@/types/domain";
import { mockLibraryItems } from "@/features/library/mockLibrary";

type LibraryStore = {
  items: LibraryItem[];
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;
  refresh: () => Promise<void>;
  addLocalItem: (item: LibraryItem) => void;
  updateItem: (id: string, update: LibraryItemUpdate) => Promise<void>;
  archiveItem: (id: string, archived: boolean) => Promise<void>;
};

const demoItems = mockLibraryItems.map((item) => ({ ...item, status: item.status ?? "active" as const }));

export const useLibraryItems = create<LibraryStore>((set, get) => ({
  items: isDemoMode && !isSupabaseConfigured ? demoItems : [],
  isLoading: false,
  error: null,
  hasLoaded: isDemoMode && !isSupabaseConfigured,
  refresh: async () => {
    if (isDemoMode && !isSupabaseConfigured) {
      set({ items: demoItems, isLoading: false, error: null, hasLoaded: true });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const items = await fetchLibraryItems();
      set({ items, isLoading: false, error: null, hasLoaded: true });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Shepherd could not open your Library yet.",
        hasLoaded: true
      });
    }
  },
  addLocalItem: (item) => {
    set((state) => ({
      items: [{ ...item, status: item.status ?? "active" }, ...state.items.filter((existing) => existing.id !== item.id)]
    }));
  },
  updateItem: async (id, update) => {
    const previous = get().items;
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...update, suggestedAction: suggestedActionForCategory(update.category) } : item))
    }));

    try {
      await updateLibraryItem(id, update);
    } catch (error) {
      set({ items: previous, error: error instanceof Error ? error.message : "Shepherd could not save that change yet." });
      throw error;
    }
  },
  archiveItem: async (id, archived) => {
    const previous = get().items;
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, status: archived ? "archived" : "active" } : item))
    }));

    try {
      await archiveLibraryItem(id, archived);
    } catch (error) {
      set({ items: previous, error: error instanceof Error ? error.message : "Shepherd could not update that item yet." });
      throw error;
    }
  }
}));

function suggestedActionForCategory(category: LibraryItem["category"]) {
  switch (category) {
    case "recipes":
      return "Would you like to add this to a meal plan?";
    case "business_ideas":
      return "Would you like to turn this into a next step?";
    case "fitness":
      return "Would you like a reminder to try this?";
    case "travel":
      return "Would you like to build an itinerary?";
    case "finance":
      return "Would you like to keep this with records?";
    default:
      return "Would you like Shepherd to keep watching this thread?";
  }
}
