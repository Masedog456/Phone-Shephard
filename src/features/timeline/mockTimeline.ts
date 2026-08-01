import { DigitalLifeChapter } from "@/types/domain";

export const digitalLifeChapters: DigitalLifeChapter[] = [
  {
    id: "timeline-march-2026",
    month: "March",
    year: 2026,
    title: "The month your ideas started asking for a shape.",
    narrative: "You moved from collecting inspiration to imagining what you could build. Business notes, fitness routines, and philosophy began appearing together.",
    focusedOn: ["Starting a business", "Fitness", "Philosophy"],
    saved: [
      { label: "Ideas", count: 14 },
      { label: "Articles", count: 22 },
      { label: "Videos", count: 31 }
    ],
    created: [
      { label: "Notes", count: 5 },
      { label: "Projects", count: 3 }
    ],
    turningPoint: "You recorded the neighborhood services idea instead of letting it disappear.",
    evolution: "Curiosity became intention. You started saving fewer random things and more material connected to a possible future business."
  },
  {
    id: "timeline-february-2026",
    month: "February",
    year: 2026,
    title: "A quieter rhythm began to emerge.",
    narrative: "Short workouts, morning routines, and reflections about patience became recurring signals across your saved world.",
    focusedOn: ["Daily routines", "Strength", "Attention"],
    saved: [
      { label: "Workouts", count: 18 },
      { label: "Quotes", count: 11 },
      { label: "Recipes", count: 9 }
    ],
    created: [
      { label: "Reminders", count: 7 },
      { label: "Voice notes", count: 4 }
    ],
    turningPoint: "You began choosing five-minute routines over ambitious plans you rarely started.",
    evolution: "Your idea of progress softened. Consistency started to matter more than intensity."
  },
  {
    id: "timeline-january-2026",
    month: "January",
    year: 2026,
    title: "You were looking for a fresh beginning.",
    narrative: "Your library filled with travel possibilities, home projects, financial learning, and ways to make everyday life feel lighter.",
    focusedOn: ["Travel", "Home", "Personal finance"],
    saved: [
      { label: "Places", count: 18 },
      { label: "Home ideas", count: 16 },
      { label: "Lessons", count: 12 }
    ],
    created: [
      { label: "Collections", count: 4 },
      { label: "Plans", count: 2 }
    ],
    turningPoint: "Your saved places in Italy became more than a wish. They started to resemble an itinerary.",
    evolution: "Possibility became planning. You began connecting inspiration to dates, budgets, and next steps."
  },
  {
    id: "timeline-december-2025",
    month: "December",
    year: 2025,
    title: "You were preserving what felt meaningful.",
    narrative: "Family photos, recipes, holiday notes, and quiet reflections dominated what you chose to keep close.",
    focusedOn: ["Family", "Traditions", "Gratitude"],
    saved: [
      { label: "Memories", count: 46 },
      { label: "Recipes", count: 13 },
      { label: "Quotes", count: 8 }
    ],
    created: [
      { label: "Albums", count: 3 },
      { label: "Journal notes", count: 6 }
    ],
    turningPoint: "A birthday photo became the beginning of a Family Memories collection.",
    evolution: "Your digital life became less about accumulation and more about deciding what deserved to remain visible."
  }
];

export const timelineArc = {
  title: "From preserving memories to building a future.",
  body: "Over four months, your saved world shifted from family and reflection toward routines, travel plans, and a recurring desire to build something of your own."
};
