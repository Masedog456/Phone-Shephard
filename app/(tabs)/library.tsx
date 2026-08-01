import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Archive, BookOpen, Brain, ChevronRight, Film, Search, Sparkles } from "lucide-react-native";
import { EmptyState } from "@/components/EmptyState";
import { IntentActionCard } from "@/components/IntentActionCard";
import { IntentProgressCard } from "@/components/IntentProgressCard";
import { LibraryFilterChip } from "@/components/LibraryFilterChip";
import { LibraryItemCard } from "@/components/LibraryItemCard";
import { Screen } from "@/components/Screen";
import { intentSuggestions } from "@/features/intent/mockIntentEngine";
import {
  categoryLabels,
  libraryCategories,
} from "@/features/library/mockLibrary";
import { useLibraryItems } from "@/features/library/useLibraryItems";
import { LibraryCategory } from "@/types/domain";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

type Filter = "all" | LibraryCategory;

export default function LibraryScreen() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [collection, setCollection] = useState("All");
  const { items, isLoading, error, refresh } = useLibraryItems();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const libraryCollections = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.collection).filter(Boolean)));
  }, [items]);

  const categoryCounts = useMemo(() => {
    return libraryCategories.reduce<Record<LibraryCategory, number>>((counts, category) => {
      counts[category] = items.filter((item) => item.category === category).length;
      return counts;
    }, {} as Record<LibraryCategory, number>);
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesFilter = filter === "all" || item.category === filter;
      const matchesCollection = collection === "All" || item.collection === collection;
      const haystack = [
        item.title,
        item.source,
        item.type,
        item.aiSummary,
        item.whySaved,
        item.suggestedAction,
        item.collection,
        categoryLabels[item.category],
        ...item.keywords
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      return matchesFilter && matchesCollection && matchesQuery;
    });
  }, [collection, filter, items, query]);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.heroIcon}>
          <BookOpen color={colors.sage} size={30} />
        </View>
        <Text style={styles.kicker}>Universal Library</Text>
        <Text style={styles.title}>Everything you saved, organized by meaning.</Text>
        <Text style={styles.subtitle}>Websites, posts, videos, photos, notes, documents, files, and voice recordings become a calm personal library.</Text>
      </View>

      <View style={styles.searchBox}>
        <Search color={colors.muted} size={20} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="that ab workout, pizza recipe, Austin flight..."
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>

      <View style={styles.shelfCard}>
        <View style={styles.shelfTop}>
          <Archive color={colors.cream} size={24} />
          <View style={styles.shelfCopy}>
            <Text style={styles.shelfLabel}>Personal Library</Text>
            <Text style={styles.shelfTitle}>
              {items.length ? `${items.length} saved things with a place to belong.` : "Your real Library is ready for its first saved thing."}
            </Text>
          </View>
        </View>
        <Text style={styles.shelfText}>Shepherd reads across source and format, then gathers things by why they matter.</Text>
      </View>

      <View style={styles.intentWrap}>
        <IntentProgressCard />
      </View>

      <Pressable style={styles.dotsCard} onPress={() => router.push("/dots")}>
        <View style={styles.dotsIcon}>
          <Brain color={colors.sage} size={23} />
        </View>
        <View style={styles.dotsCopy}>
          <Text style={styles.dotsKicker}>Connect the Dots</Text>
          <Text style={styles.dotsTitle}>Your saved things may be pointing somewhere.</Text>
          <Text style={styles.dotsText}>Find themes, unfinished ideas, goals, and recurring ambitions across your whole digital life.</Text>
        </View>
        <ChevronRight color={colors.muted} size={18} />
      </Pressable>

      <Pressable style={styles.timelineCard} onPress={() => router.push("/timeline")}>
        <View style={styles.dotsIcon}>
          <Film color={colors.blue} size={23} />
        </View>
        <View style={styles.dotsCopy}>
          <Text style={styles.timelineKicker}>Your Digital Life</Text>
          <Text style={styles.dotsTitle}>See how your focus evolved over time.</Text>
          <Text style={styles.dotsText}>
            A documentary of what you saved, created, revisited, and slowly became.
          </Text>
        </View>
        <ChevronRight color={colors.muted} size={20} />
      </Pressable>

      <View style={styles.resultsHeader}>
        <View>
          <Text style={styles.sectionTitle}>Intent suggestions</Text>
          <Text style={styles.sectionSubtitle}>Shepherd turns patterns into gentle next steps.</Text>
        </View>
        <View style={styles.countPill}>
          <Sparkles color={colors.sage} size={14} />
          <Text style={styles.countText}>{intentSuggestions.length}</Text>
        </View>
      </View>

      <View style={styles.intentList}>
        {intentSuggestions.map((suggestion) => (
          <IntentActionCard key={suggestion.id} suggestion={suggestion} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>AI categories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <LibraryFilterChip label="All" selected={filter === "all"} onPress={() => setFilter("all")} />
        {libraryCategories.map((category) => (
          <LibraryFilterChip
            key={category}
            label={`${categoryLabels[category]} ${categoryCounts[category] ?? 0}`}
            selected={filter === category}
            onPress={() => setFilter(category)}
          />
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>Collections</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {["All", ...libraryCollections].map((name) => (
          <LibraryFilterChip key={name} label={name} selected={collection === name} onPress={() => setCollection(name)} />
        ))}
      </ScrollView>

      <Pressable style={styles.timelineCard} onPress={() => router.push("/timeline")}>
        <View style={styles.dotsIcon}>
          <Film color={colors.blue} size={23} />
        </View>
        <View style={styles.dotsCopy}>
          <Text style={styles.timelineKicker}>Your Digital Life</Text>
          <Text style={styles.dotsTitle}>See how your focus evolved over time.</Text>
          <Text style={styles.dotsText}>
            A documentary of what you saved, created, revisited, and slowly became.
          </Text>
        </View>
        <ChevronRight color={colors.muted} size={20} />
      </Pressable>

      <View style={styles.resultsHeader}>
        <View>
          <Text style={styles.sectionTitle}>Saved things</Text>
          <Text style={styles.sectionSubtitle}>Source and type are details. Meaning is the shelf.</Text>
        </View>
        <View style={styles.countPill}>
          <Sparkles color={colors.sage} size={14} />
          <Text style={styles.countText}>{filteredItems.length}</Text>
        </View>
      </View>

      <View style={styles.list}>
        {isLoading ? (
          <EmptyState
            title="Shepherd is opening your private Library."
            body="Your saved things are being gathered quietly from Supabase."
            examples={["Captures", "Transformations", "Memories"]}
          />
        ) : error ? (
          <EmptyState
            title="Shepherd could not open this shelf yet."
            body={error}
            examples={["Check sign-in", "Refresh", "Try again"]}
          />
        ) : filteredItems.length ? (
          filteredItems.map((item) => <LibraryItemCard key={item.id} item={item} />)
        ) : (
          <Pressable onPress={() => router.push("/capture")}>
            <EmptyState
              title="This shelf is waiting for its first saved thing."
              body="Capture something valuable, let Shepherd understand it, and it will appear here with context and a next step."
              examples={["Recipes", "Business Ideas", "Fitness", "Wisdom"]}
            />
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    marginTop: spacing.md
  },
  intentWrap: {
    marginTop: spacing.xl
  },
  intentList: {
    gap: spacing.lg,
    marginTop: spacing.md
  },
  dotsCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    ...shadows.soft
  },
  dotsIcon: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
  },
  dotsCopy: {
    flex: 1,
    gap: spacing.xs
  },
  dotsKicker: {
    ...typography.label,
    color: colors.sage
  },
  dotsTitle: {
    ...typography.cardTitle,
    color: colors.ink
  },
  dotsText: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 26,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.quiet
  },
  kicker: {
    ...typography.label,
    color: colors.sage
  },
  title: {
    ...typography.title,
    color: colors.ink
  },
  subtitle: {
    ...typography.body,
    color: colors.subtle
  },
  searchBox: {
    minHeight: 58,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    ...shadows.quiet
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.ink
  },
  shelfCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    padding: spacing.xl,
    gap: spacing.lg,
    marginTop: spacing.xl,
    ...shadows.soft
  },
  shelfTop: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center"
  },
  shelfCopy: {
    flex: 1,
    gap: spacing.xs
  },
  shelfLabel: {
    ...typography.label,
    color: colors.mist
  },
  shelfTitle: {
    ...typography.subtitle,
    color: colors.cream
  },
  shelfText: {
    ...typography.body,
    color: colors.cream
  },
  sectionTitle: {
    ...typography.cardTitle,
    color: colors.ink,
    marginTop: spacing.xl
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.subtle,
    marginTop: spacing.xs
  },
  filterRow: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingRight: spacing.lg
  },
  timelineCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.cardSoft,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
    ...shadows.quiet
  },
  timelineKicker: {
    ...typography.label,
    color: colors.blue
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: spacing.md
  },
  countPill: {
    borderRadius: radii.pill,
    backgroundColor: colors.mist,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  countText: {
    ...typography.button,
    color: colors.sage
  },
  list: {
    gap: spacing.lg,
    marginTop: spacing.md
  }
});
