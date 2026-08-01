import { BookOpen, Camera, FileText, Globe, Lightbulb, Quote, Receipt, Sparkles } from "lucide-react-native";
import { colors } from "@/lib/theme";

export type WeeklyInsight = {
  id: string;
  label: string;
  value: string;
  tone: string;
};

export type ForgottenTreasure = {
  id: string;
  title: string;
  source: string;
  description: string;
  whyItMatters: string;
  icon: typeof Camera;
  color: string;
};

export type ReportMetric = {
  id: string;
  label: string;
  value: string;
  caption: string;
};

export const weeklyInsights: WeeklyInsight[] = [
  {
    id: "screenshots",
    label: "Moments from screenshots",
    value: "147",
    tone: "Recipes, purchases, quotes, and plans may be easier to organize."
  },
  {
    id: "tabs",
    label: "Research waiting to be revisited",
    value: "39",
    tone: "A small review could rescue research without keeping every tab open."
  },
  {
    id: "ideas",
    label: "Ideas hidden in notes",
    value: "12",
    tone: "Shepherd found sparks that may deserve a calmer place to live."
  },
  {
    id: "saved-posts",
    label: "Inspiration saved for a reason",
    value: "24",
    tone: "Saved inspiration can become something useful again."
  }
];

export const forgottenTreasures: ForgottenTreasure[] = [
  {
    id: "daughter-birthday",
    title: "Birthday memory from last spring",
    source: "Photos",
    description: "A warm set of photos from a family birthday that has not been opened in months.",
    whyItMatters: "Worth keeping close",
    icon: Camera,
    color: colors.sage
  },
  {
    id: "saved-article",
    title: "Article about building better habits",
    source: "Saved Article",
    description: "A saved read about morning routines and attention that looks like something you wanted to revisit.",
    whyItMatters: "Worth reading",
    icon: FileText,
    color: colors.sage
  },
  {
    id: "business-idea",
    title: "Voice note about a product idea",
    source: "Notes",
    description: "A rough idea about helping local shops manage customer follow-ups.",
    whyItMatters: "Possible future project",
    icon: Lightbulb,
    color: colors.clay
  },
  {
    id: "recipe",
    title: "Pizza dough recipe",
    source: "Screenshots",
    description: "Ingredients and timing from a recipe page you saved while planning dinner.",
    whyItMatters: "Ready for recipe folder",
    icon: BookOpen,
    color: colors.blue
  },
  {
    id: "philosophy-quote",
    title: "Quote about patience",
    source: "Saved Posts",
    description: "A saved post that reads like something you wanted to remember later.",
    whyItMatters: "Belongs in Wisdom",
    icon: Quote,
    color: colors.ink
  },
  {
    id: "receipt",
    title: "Hardware store receipt",
    source: "Receipts",
    description: "A recent receipt that may matter for a return or project expense.",
    whyItMatters: "Useful record",
    icon: Receipt,
    color: colors.sage
  }
];

export const monthlyReport = {
  month: "June",
  headline: "Your digital life got lighter.",
  shareText:
    "Phone Shepherd helped me rediscover 18 meaningful saved things, collect 12 ideas, and bring 1.8 GB of digital clutter back under control this month.",
  metrics: [
    {
      id: "memories",
      label: "Memories rediscovered",
      value: "18",
      caption: "Photos and saved moments surfaced at the right time."
    },
    {
      id: "storage",
      label: "Storage recovered",
      value: "1.8 GB",
      caption: "Duplicates, blurry shots, and accidental captures reviewed."
    },
    {
      id: "ideas",
      label: "Ideas collected",
      value: "12",
      caption: "Notes and screenshots that looked like future projects."
    },
    {
      id: "recipes",
      label: "Recipes rescued",
      value: "9",
      caption: "Food screenshots ready to become searchable."
    }
  ] satisfies ReportMetric[],
  interests: ["Home projects", "Fitness", "Recipes", "Philosophy", "Travel"],
  trends: [
    "You saved more ideas on Sunday evenings.",
    "Recipes and home project receipts were your most common saved themes.",
    "Your screenshots are becoming easier to trust because sensitive saved things are flagged first."
  ],
  icons: {
    memories: Sparkles,
    tabs: Globe,
    notes: FileText
  }
};
