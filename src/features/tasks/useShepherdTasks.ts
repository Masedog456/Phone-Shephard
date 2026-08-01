import { create } from "zustand";
import { defaultTasks, createMockResults } from "@/features/tasks/mockTasks";
import { ShepherdTask, ShepherdTaskAction, ShepherdTaskResult, ShepherdTaskSource } from "@/types/domain";

export type TaskDraft = {
  name: string;
  description: string;
  aiInstruction: string;
  source: ShepherdTaskSource;
  action: ShepherdTaskAction;
};

type TaskStore = {
  tasks: ShepherdTask[];
  resultsByTaskId: Record<string, ShepherdTaskResult[]>;
  createTask: (draft: TaskDraft) => ShepherdTask;
  updateTask: (id: string, draft: TaskDraft) => void;
  deleteTask: (id: string) => void;
  runTask: (id: string) => ShepherdTaskResult[];
};

export const useShepherdTasks = create<TaskStore>((set, get) => ({
  tasks: defaultTasks,
  resultsByTaskId: {},
  createTask: (draft) => {
    const task: ShepherdTask = {
      id: `custom-${Date.now()}`,
      ...draft,
      status: "custom",
      cadence: "manual",
      resultCount: 0,
      lastRunAt: null,
      createdAt: new Date().toISOString(),
      isDefault: false
    };

    set((state) => ({ tasks: [task, ...state.tasks] }));
    return task;
  },
  updateTask: (id, draft) => {
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...draft } : task))
    }));
  },
  deleteTask: (id) => {
    set((state) => {
      const nextResults = { ...state.resultsByTaskId };
      delete nextResults[id];
      return {
        tasks: state.tasks.filter((task) => task.id !== id),
        resultsByTaskId: nextResults
      };
    });
  },
  runTask: (id) => {
    const task = get().tasks.find((candidate) => candidate.id === id);
    if (!task) {
      return [];
    }

    // Future integrations connect here: browser history/tabs, notes, social bookmarks,
    // document providers, reminders, and link-saving services should replace mock results.
    const results = createMockResults(task);

    set((state) => ({
      tasks: state.tasks.map((candidate) =>
        candidate.id === id ? { ...candidate, resultCount: results.length, lastRunAt: new Date().toISOString() } : candidate
      ),
      resultsByTaskId: {
        ...state.resultsByTaskId,
        [id]: results
      }
    }));

    return results;
  }
}));
