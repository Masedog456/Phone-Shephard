import { create } from "zustand";
import { createTransformation, fetchTransformation, saveTransformation, scheduleTransformationReminder, submitTransformationFeedback } from "@/lib/api";
import { useLibraryItems } from "@/features/library/useLibraryItems";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { CaptureAction, CapturedContent, TransformationResult } from "@/types/domain";
import { transformationForTask, transformationResults } from "@/features/transformation/mockTransformations";

type Store = {
  results: Record<string, TransformationResult>;
  isCreating: boolean;
  isLoading: boolean;
  error: string | null;
  loadById: (id: string) => Promise<TransformationResult | null>;
  createFromCapture: (capture: CapturedContent, action: CaptureAction) => Promise<TransformationResult>;
  save: (id: string) => Promise<void>;
  remind: (id: string, message: string) => Promise<void>;
  feedback: (id: string, rating: "useful" | "not_useful" | "wrong_category") => Promise<void>;
};

export const useTransformations = create<Store>((set, get) => ({
  results: transformationResults,
  isCreating: false,
  isLoading: false,
  error: null,
  loadById: async (id) => {
    const existing = get().results[id];
    if (existing) return existing;
    if (isDemoMode && !isSupabaseConfigured) return null;

    set({ isLoading: true, error: null });
    try {
      const result = await fetchTransformation(id);
      if (result) {
        set((state) => ({ results: { ...state.results, [result.id]: result }, isLoading: false, error: null }));
      } else {
        set({ isLoading: false, error: "Shepherd could not find that result in your account." });
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Shepherd could not open that result yet.";
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },
  createFromCapture: async (capture, action) => {
    set({ isCreating: true });
    try {
      const result = isDemoMode && !isSupabaseConfigured
        ? { ...transformationResults[transformationForTask(capture.suggestedShepherdId)], id: `demo-${capture.id}` }
        : await createTransformation(capture, action);
      set((state) => ({ results: { ...state.results, [result.id]: result } }));
      void useLibraryItems.getState().refresh();
      return result;
    } finally {
      set({ isCreating: false });
    }
  },
  save: async (id) => {
    await saveTransformation(id);
    set((state) => ({
      results: state.results[id]
        ? { ...state.results, [id]: { ...state.results[id], savedToLibrary: true } }
        : state.results
    }));
    await useLibraryItems.getState().refresh();
  },
  remind: scheduleTransformationReminder,
  feedback: submitTransformationFeedback
}));
