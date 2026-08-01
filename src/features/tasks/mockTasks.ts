import { ShepherdTask, ShepherdTaskResult, ShepherdTaskSource } from "@/types/domain";

export const sourceLabels: Record<ShepherdTaskSource, string> = {
  photos: "Photos",
  screenshots: "Screenshots",
  tabs: "Tabs",
  notes: "Notes",
  saved_posts: "Saved Posts",
  documents: "Documents",
  receipts: "Receipts",
  links: "Links",
  reminders: "Reminders",
  custom: "Custom"
};

export const defaultTasks: ShepherdTask[] = [
  {
    id: "task-photos",
    name: "Memory Shepherd",
    description: "I keep watch over your camera roll and protect the moments that might hold meaning.",
    aiInstruction: "Look for photos that can be reviewed safely while protecting meaningful memories.",
    source: "photos",
    action: "review",
    status: "ready",
    cadence: "weekly",
    resultCount: 6,
    lastRunAt: null,
    createdAt: new Date().toISOString(),
    isDefault: true
  },
  {
    id: "task-screenshots-recipes",
    name: "Recipe Shepherd",
    description: "I gather recipes you saved in the moment and place them somewhere easy to return to.",
    aiInstruction: "Notice ingredients, cooking steps, oven timing, or saved food ideas.",
    source: "screenshots",
    action: "categorize",
    status: "ready",
    cadence: "manual",
    resultCount: 3,
    lastRunAt: null,
    createdAt: new Date().toISOString(),
    isDefault: true
  },
  {
    id: "task-tabs-stale",
    name: "Research Shepherd",
    description: "I remember the research paths you meant to revisit and help you keep the ones that still matter.",
    aiInstruction: "Notice research paths that appear meaningful, duplicated, time-sensitive, or ready to rest.",
    source: "tabs",
    action: "archive",
    status: "coming_soon",
    cadence: "weekly",
    resultCount: 4,
    lastRunAt: null,
    createdAt: new Date().toISOString(),
    isDefault: true
  },
  {
    id: "task-notes-ideas",
    name: "Idea Shepherd",
    description: "I keep watch over your thoughts and bring back the ones worth growing.",
    aiInstruction: "Notice business ideas, customer pain points, product sketches, or pricing thoughts.",
    source: "notes",
    action: "summarize",
    status: "coming_soon",
    cadence: "manual",
    resultCount: 5,
    lastRunAt: null,
    createdAt: new Date().toISOString(),
    isDefault: true
  },
  {
    id: "task-posts-fitness",
    name: "Inspiration Shepherd",
    description: "I turn saved inspiration into themes you can actually use later.",
    aiInstruction: "Group saved posts by theme so the useful ideas can be found again.",
    source: "saved_posts",
    action: "summarize",
    status: "coming_soon",
    cadence: "manual",
    resultCount: 4,
    lastRunAt: null,
    createdAt: new Date().toISOString(),
    isDefault: true
  },
  {
    id: "task-receipts-month",
    name: "Receipt Shepherd",
    description: "I keep useful records close so returns, warranties, and expenses do not disappear.",
    aiInstruction: "Notice receipts, invoices, bills, and order confirmations from the current month.",
    source: "receipts",
    action: "save",
    status: "ready",
    cadence: "monthly",
    resultCount: 2,
    lastRunAt: null,
    createdAt: new Date().toISOString(),
    isDefault: true
  },
  {
    id: "task-links-unopened",
    name: "Link Shepherd",
    description: "I bring back links you saved for a reason, when they still feel useful.",
    aiInstruction: "Notice unread links that appear time-sensitive, meaningful, or useful enough to revisit.",
    source: "links",
    action: "remind_later",
    status: "coming_soon",
    cadence: "weekly",
    resultCount: 3,
    lastRunAt: null,
    createdAt: new Date().toISOString(),
    isDefault: true
  }
];

export const mockResultsByTask: Record<string, ShepherdTaskResult[]> = {
  "task-photos": [
    {
      id: "result-photo-duplicate",
      taskId: "task-photos",
      title: "3 likely duplicate photos",
      sourceLabel: "Photos",
      preview: "Similar images from the same burst, taken within 12 seconds.",
      suggestedAction: "review",
      reason: "Duplicates are likely safe to review, but memories should be confirmed first.",
      integrationStatus: "mock"
    },
    {
      id: "result-photo-blurry",
      taskId: "task-photos",
      title: "2 blurry images",
      sourceLabel: "Photos",
      preview: "Low-detail photos that look accidental.",
      suggestedAction: "delete",
      reason: "These appear unlikely to be useful, but letting go still requires your confirmation.",
      integrationStatus: "mock"
    }
  ],
  "task-screenshots-recipes": [
    {
      id: "result-recipe-pizza",
      taskId: "task-screenshots-recipes",
      title: "Pizza dough recipe",
      sourceLabel: "Screenshots",
      preview: "Ingredients and oven timing saved from a recipe page.",
      suggestedAction: "categorize",
      reason: "Recipe screenshots become calmer when they are grouped and searchable.",
      integrationStatus: "mock"
    }
  ],
  "task-receipts-month": [
    {
      id: "result-receipt-hardware",
      taskId: "task-receipts-month",
      title: "Hardware store receipt",
      sourceLabel: "Receipts",
      preview: "Purchase receipt from this month.",
      suggestedAction: "save",
      reason: "Receipts may matter for returns, expenses, or warranty records.",
      isSensitive: true,
      integrationStatus: "mock"
    }
  ]
};

export function createMockResults(task: ShepherdTask): ShepherdTaskResult[] {
  if (mockResultsByTask[task.id]) {
    return mockResultsByTask[task.id];
  }

  return [
    {
      id: `${task.id}-mock-1`,
      taskId: task.id,
      title: `${sourceLabels[task.source]} preview finding`,
      sourceLabel: sourceLabels[task.source],
      preview: "Future connections will replace this with real saved things from the selected place.",
      suggestedAction: task.action,
      reason: task.aiInstruction,
      integrationStatus: task.status === "coming_soon" ? "coming_soon" : "mock"
    },
    {
      id: `${task.id}-mock-2`,
      taskId: task.id,
      title: "Another gentle finding",
      sourceLabel: sourceLabels[task.source],
      preview: "This preview keeps the review ritual ready while connections are built.",
      suggestedAction: task.action,
      reason: "This shows how Shepherd will guide the ritual once this place is connected.",
      integrationStatus: task.status === "coming_soon" ? "coming_soon" : "mock"
    }
  ];
}
