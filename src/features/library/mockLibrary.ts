import { LibraryCategory, LibraryItem } from "@/types/domain";

export const categoryLabels: Record<LibraryCategory, string> = {
  recipes: "Recipes",
  business_ideas: "Business Ideas",
  fitness: "Fitness",
  travel: "Travel",
  shopping: "Shopping",
  wisdom: "Wisdom",
  finance: "Finance",
  family: "Family",
  education: "Education",
  entertainment: "Entertainment"
};

export const libraryCategories: LibraryCategory[] = [
  "recipes",
  "business_ideas",
  "fitness",
  "travel",
  "shopping",
  "wisdom",
  "finance",
  "family",
  "education",
  "entertainment"
];

export const libraryCollections = [
  "Sunday Reset",
  "Things to Try",
  "Home Projects",
  "Ideas Worth Growing",
  "Family Memories",
  "Receipts and Records"
];

export const mockLibraryItems: LibraryItem[] = [
  {
    id: "lib-ab-workout",
    source: "Instagram",
    type: "Video",
    title: "5 minute ab workout",
    aiSummary: "Core workout requiring no equipment and designed for quick daily repetition.",
    whySaved: "Fitness goals",
    suggestedAction: "Would you like to schedule this workout?",
    category: "fitness",
    collection: "Things to Try",
    creator: "@dailycore",
    capturedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    keywords: ["core", "fitness", "routine", "no equipment"]
  },
  {
    id: "lib-pizza",
    source: "Safari",
    type: "Website",
    title: "Crispy pizza dough recipe",
    aiSummary: "Overnight dough recipe with high-heat baking instructions and simple ingredients.",
    whySaved: "Dinner idea",
    suggestedAction: "Would you like to add this to Recipe Shepherd?",
    category: "recipes",
    collection: "Sunday Reset",
    creator: "Kitchen Notes",
    capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    keywords: ["pizza", "recipe", "dough", "dinner"]
  },
  {
    id: "lib-startup-note",
    source: "Voice Notes",
    type: "Voice recording",
    title: "Neighborhood services app idea",
    aiSummary: "A concept for helping local service providers manage recurring clients and follow-ups.",
    whySaved: "Business idea",
    suggestedAction: "Would you like to turn this into an action item?",
    category: "business_ideas",
    collection: "Ideas Worth Growing",
    creator: "You",
    capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    keywords: ["startup", "local services", "customers", "follow-up"]
  },
  {
    id: "lib-flight",
    source: "Photos",
    type: "Screenshot",
    title: "Austin flight confirmation",
    aiSummary: "Travel confirmation with flight time, airline, and confirmation details.",
    whySaved: "Travel plans",
    suggestedAction: "Would you like a reminder the day before departure?",
    category: "travel",
    collection: "Sunday Reset",
    creator: "Airline confirmation",
    capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    keywords: ["flight", "Austin", "travel", "confirmation"]
  },
  {
    id: "lib-desk",
    source: "Pinterest",
    type: "Pin",
    title: "Warm walnut desk setup",
    aiSummary: "Minimal home office reference with natural wood, soft lighting, and hidden cable storage.",
    whySaved: "Home project inspiration",
    suggestedAction: "Would you like to add this to Home Projects?",
    category: "shopping",
    collection: "Home Projects",
    creator: "Studio Pinboard",
    capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    keywords: ["desk", "home office", "shopping", "design"]
  },
  {
    id: "lib-quote",
    source: "X",
    type: "Post",
    title: "Quote about patience",
    aiSummary: "A short reflection about letting ideas mature before forcing decisions.",
    whySaved: "Wisdom",
    suggestedAction: "Would you like to place this in Wisdom?",
    category: "wisdom",
    collection: "Things to Try",
    creator: "@quietnotes",
    capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    keywords: ["quote", "patience", "reflection", "wisdom"]
  },
  {
    id: "lib-receipt",
    source: "Files",
    type: "PDF",
    title: "June hardware receipt",
    aiSummary: "Receipt for home project supplies that may matter for returns, warranties, or expenses.",
    whySaved: "Useful record",
    suggestedAction: "Would you like to keep this with Receipts and Records?",
    category: "finance",
    collection: "Receipts and Records",
    creator: "Hardware Market",
    capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 38).toISOString(),
    keywords: ["receipt", "hardware", "expense", "warranty"]
  },
  {
    id: "lib-birthday",
    source: "Photos",
    type: "Photo",
    title: "Birthday candles in the kitchen",
    aiSummary: "A family birthday moment with candles, cake, and people gathered around the table.",
    whySaved: "Family memory",
    suggestedAction: "Would you like to add this to Family Memories?",
    category: "family",
    collection: "Family Memories",
    creator: "You",
    capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    keywords: ["birthday", "family", "memory", "kitchen"]
  },
  {
    id: "lib-course",
    source: "YouTube",
    type: "Video",
    title: "Intro to personal finance",
    aiSummary: "A beginner-friendly explanation of budgeting, emergency funds, and debt payoff order.",
    whySaved: "Learning",
    suggestedAction: "Would you like a summary with key steps?",
    category: "education",
    collection: "Things to Try",
    creator: "Money Basics",
    capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
    keywords: ["education", "finance", "budgeting", "learning"]
  },
  {
    id: "lib-movie-thread",
    source: "Reddit",
    type: "Post",
    title: "Best cozy mystery movies",
    aiSummary: "A recommendation thread with mystery films that are low-stress and good for a quiet night.",
    whySaved: "Entertainment ideas",
    suggestedAction: "Would you like to create a watchlist?",
    category: "entertainment",
    collection: "Things to Try",
    creator: "r/movies",
    capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
    keywords: ["movies", "mystery", "watchlist", "cozy"]
  }
];

export function getCategoryCount(category: LibraryCategory) {
  return mockLibraryItems.filter((item) => item.category === category).length;
}
