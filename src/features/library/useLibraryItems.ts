import { create } from "zustand";
import { fetchLibraryItems } from "@/lib/api";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { LibraryItem } from "@/types/domain";
import { mockLibraryItems } from "@/features/library/mockLibrary";

type LibraryStore = {
  items: LibraryItem[];
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;
  refresh: () => Promise<void>;
  addLocalItem: (item: LibraryItem) => void;
};

export const useLibraryItems = create<LibraryStore>((set) => ({
  items: isDemoMode && !isSupabaseConfigured ? mockLibraryItems : [],
  isLoading: false,
  error: null,
  hasLoaded: isDemoMode && !isSupabaseConfigured,
  refresh: async () => {
    if (isDemoMode && !isSupabaseConfigured) {
      set({ items: mockLibraryItems, isLoading: false, error: null, hasLoaded: true });
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
      items: [item, ...state.items.filter((existing) => existing.id !== item.id)]
    }));
  }
}));
