import { create } from "zustand";
import { ingestUrl, saveUserNote } from "@/lib/api";
import { useLibraryItems } from "@/features/library/useLibraryItems";
import { LibraryItem, UrlIngestResult } from "@/types/domain";

export type IntakePhase = "idle" | "fetching" | "ready" | "failed";

export type IntakeFailure = { reason: string; message: string; retryable: boolean; itemId: string | null };

type UrlIntakeStore = {
  phase: IntakePhase;
  lastUrl: string;
  result: UrlIngestResult | null;
  failure: IntakeFailure | null;
  submit: (url: string) => Promise<UrlIngestResult | null>;
  attachNote: (id: string, note: string) => Promise<void>;
  reset: () => void;
};

export const useUrlIntake = create<UrlIntakeStore>((set, get) => ({
  phase: "idle",
  lastUrl: "",
  result: null,
  failure: null,

  submit: async (url) => {
    set({ phase: "fetching", lastUrl: url, result: null, failure: null });
    try {
      const result = await ingestUrl(url);
      set({ phase: "ready", result, failure: null });
      // The source is already persisted server-side; refresh so it appears in the Library.
      void useLibraryItems.getState().refresh();
      return result;
    } catch (error) {
      const failure: IntakeFailure = {
        reason: (error as { reason?: string }).reason ?? "unknown",
        message: error instanceof Error ? error.message : "Shepherd could not open that link.",
        retryable: (error as { retryable?: boolean }).retryable ?? false,
        itemId: (error as { itemId?: string | null }).itemId ?? null
      };
      set({ phase: "failed", failure, result: null });
      // A failed fetch is still recorded server-side when it got far enough, so the Library
      // reflects the attempt rather than losing it.
      if (failure.itemId) void useLibraryItems.getState().refresh();
      return null;
    }
  },

  attachNote: async (id, note) => {
    await saveUserNote(id, note);
    const current = get().result;
    if (current && current.item.id === id) {
      set({ result: { ...current, item: { ...current.item, userNote: note } as LibraryItem } });
    }
    void useLibraryItems.getState().refresh();
  },

  reset: () => set({ phase: "idle", lastUrl: "", result: null, failure: null })
}));
