import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, Vibration, View } from "react-native";
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
import { createTransformationFromLibraryItem } from "@/lib/api";
import { LibraryCategory, LibraryItem, LibraryItemUpdate } from "@/types/domain";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

type Filter = "all" | LibraryCategory;

export default function LibraryScreen() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [collection, setCollection] = useState("All");
  const [showArchived, setShowArchived] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  const { items, isLoading, error, refresh, updateItem, archiveItem } = useLibraryItems();
  const [transformingItemId, setTransformingItemId] = useState<string | null>(null);

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
      const matchesStatus = showArchived ? item.status === "archived" : item.status !== "archived";
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
      return matchesStatus && matchesFilter && matchesCollection && matchesQuery;
    });
  }, [collection, filter, items, query, showArchived]);

  const activeCount = items.filter((item) => item.status !== "archived").length;
  const archivedCount = items.filter((item) => item.status === "archived").length;

  async function handleUpdateItem(id: string, update: LibraryItemUpdate) {
    try {
      await updateItem(id, update);
      setEditingItem(null);
      Vibration.vibrate(6);
    } catch (saveError) {
      Alert.alert("Shepherd could not save that yet", saveError instanceof Error ? saveError.message : "Try again in a moment.");
    }
  }

  async function handleArchiveItem(item: LibraryItem) {
    const archived = item.status !== "archived";
    try {
      await archiveItem(item.id, archived);
      Vibration.vibrate(6);
    } catch (archiveError) {
      Alert.alert("Nothing changed", archiveError instanceof Error ? archiveError.message : "Try again in a moment.");
    }
  }

  async function handleTransformItem(item: LibraryItem) {
    setTransformingItemId(item.id);
    try {
      const result = await createTransformationFromLibraryItem(item);
      Vibration.vibrate(8);
      router.push(`/transformation/${result.id}`);
    } catch (transformError) {
      Alert.alert("Shepherd needs another moment", transformError instanceof Error ? transformError.message : "This saved thing could not be transformed yet.");
    } finally {
      setTransformingItemId(null);
    }
  }

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

      <Text style={styles.sectionTitle}>Library status</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <LibraryFilterChip label={`Active ${activeCount}`} selected={!showArchived} onPress={() => setShowArchived(false)} />
        <LibraryFilterChip label={`Archived ${archivedCount}`} selected={showArchived} onPress={() => setShowArchived(true)} />
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
          filteredItems.map((item) => (
            <LibraryItemCard
              key={item.id}
              item={{
                ...item,
                suggestedAction: transformingItemId === item.id ? "Shepherd is creating a useful next step..." : item.suggestedAction
              }}
              onEdit={() => setEditingItem(item)}
              onArchive={() => void handleArchiveItem(item)}
              onTransform={() => void handleTransformItem(item)}
            />
          ))
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

      <EditLibraryItemModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={(id, update) => void handleUpdateItem(id, update)}
      />
    </Screen>
  );
}

function EditLibraryItemModal({
  item,
  onClose,
  onSave
}: {
  item: LibraryItem | null;
  onClose: () => void;
  onSave: (id: string, update: LibraryItemUpdate) => void;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [whySaved, setWhySaved] = useState("");
  const [category, setCategory] = useState<LibraryCategory>("education");
  const [collection, setCollection] = useState("");
  const [keywords, setKeywords] = useState("");

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setSummary(item.aiSummary);
    setWhySaved(item.whySaved);
    setCategory(item.category);
    setCollection(item.collection);
    setKeywords(item.keywords.join(", "));
  }, [item]);

  function save() {
    if (!item) return;
    if (!title.trim() || !summary.trim()) {
      Alert.alert("Add a little more context", "A saved thing needs a title and a short summary so Shepherd can find it later.");
      return;
    }

    onSave(item.id, {
      title: title.trim(),
      aiSummary: summary.trim(),
      whySaved: whySaved.trim() || "Something you wanted to remember",
      category,
      collection: collection.trim() || "Captured by Shepherd",
      keywords: keywords
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    });
  }

  return (
    <Modal visible={Boolean(item)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.editSheet}>
          <Text style={styles.editKicker}>Tune this memory</Text>
          <Text style={styles.editTitle}>Make it easier for Shepherd to find later.</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={colors.muted} style={styles.editInput} />
          <TextInput value={summary} onChangeText={setSummary} placeholder="AI summary" placeholderTextColor={colors.muted} multiline style={[styles.editInput, styles.editTextArea]} />
          <TextInput value={whySaved} onChangeText={setWhySaved} placeholder="Why you saved it" placeholderTextColor={colors.muted} style={styles.editInput} />
          <TextInput value={collection} onChangeText={setCollection} placeholder="Collection" placeholderTextColor={colors.muted} style={styles.editInput} />
          <TextInput value={keywords} onChangeText={setKeywords} placeholder="Keywords, separated by commas" placeholderTextColor={colors.muted} style={styles.editInput} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editChips}>
            {libraryCategories.map((option) => (
              <LibraryFilterChip key={option} label={categoryLabels[option]} selected={category === option} onPress={() => setCategory(option)} />
            ))}
          </ScrollView>

          <View style={styles.editActions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={save}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(32, 48, 51, 0.26)",
    justifyContent: "flex-end",
    padding: spacing.lg
  },
  editSheet: {
    maxHeight: "88%",
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.soft
  },
  editKicker: {
    ...typography.label,
    color: colors.sage
  },
  editTitle: {
    ...typography.subtitle,
    color: colors.ink
  },
  editInput: {
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.cardSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.ink
  },
  editTextArea: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  editChips: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingRight: spacing.lg
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.xl,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  cancelText: {
    ...typography.button,
    color: colors.ink
  },
  saveButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center"
  },
  saveText: {
    ...typography.button,
    color: colors.cream
  }
});
