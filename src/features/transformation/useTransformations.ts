import { create } from "zustand";
import { createTransformation, saveTransformation, scheduleTransformationReminder, submitTransformationFeedback } from "@/lib/api";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { CaptureAction, CapturedContent, TransformationResult } from "@/types/domain";
import { transformationForTask, transformationResults } from "@/features/transformation/mockTransformations";

type Store = {
  results: Record<string, TransformationResult>;
  isCreating: boolean;
  createFromCapture: (capture: CapturedContent, action: CaptureAction) => Promise<TransformationResult>;
  save: (id: string) => Promise<void>;
  remind: (id: string, message: string) => Promise<void>;
  feedback: (id: string, rating: "useful" | "not_useful" | "wrong_category") => Promise<void>;
};

export const useTransformations = create<Store>((set) => ({
  results: transformationResults,
  isCreating: false,
  createFromCapture: async (capture, action) => {
    set({ isCreating: true });
    try {
      const result = isDemoMode && !isSupabaseConfigured
        ? { ...transformationResults[transformationForTask(capture.suggestedShepherdId)], id: `demo-${capture.id}` }
        : await createTransformation(capture, action);
      set((state) => ({ results: { ...state.results, [result.id]: result } }));
      return result;
    } finally {
      set({ isCreating: false });
    }
  },
  save: saveTransformation,
  remind: scheduleTransformationReminder,
  feedback: submitTransformationFeedback
}));
