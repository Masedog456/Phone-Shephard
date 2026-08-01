import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Brain, ChevronRight, MessageCircle, Search, Sparkles } from "lucide-react-native";
import { IntentActionCard } from "@/components/IntentActionCard";
import { LibraryItemCard } from "@/components/LibraryItemCard";
import { Screen } from "@/components/Screen";
import { askMemory, memoryPrompts, MemoryAnswer } from "@/features/memory/askMemory";
import { useLibraryItems } from "@/features/library/useLibraryItems";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function AskYourMemoryScreen() {
  const [draft, setDraft] = useState("");
  const { items, isLoading, error, refresh } = useLibraryItems();
  const [answer, setAnswer] = useState<MemoryAnswer>(() => askMemory("", []));

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setAnswer((current) => askMemory(current.question === "What can I ask?" ? "" : current.question, items));
  }, [items]);

  const relatedItems = useMemo(
    () => answer.relatedItemIds.map((id) => items.find((item) => item.id === id)).filter(Boolean),
    [answer.relatedItemIds, items]
  );

  function submit(question = draft) {
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }
    setDraft(trimmed);
    setAnswer(askMemory(trimmed, items));
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.heroIcon}>
          <Brain color={colors.sage} size={30} />
        </View>
        <Text style={styles.kicker}>Ask Your Memory</Text>
        <Text style={styles.title}>Ask naturally. Shepherd will remember the context.</Text>
        <Text style={styles.subtitle}>Search across photos, videos, notes, websites, social posts, documents, and Shepherds by meaning.</Text>
      </View>

      <View style={styles.askBox}>
        <MessageCircle color={colors.muted} size={20} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => submit()}
          placeholder="Where is that chicken recipe I saved?"
          placeholderTextColor={colors.muted}
          style={styles.input}
          returnKeyType="send"
        />
        <Pressable style={styles.askButton} onPress={() => submit()}>
          <Search color={colors.cream} size={18} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptRow}>
        {memoryPrompts.map((prompt) => (
          <Pressable key={prompt} style={({ pressed }) => [styles.promptChip, pressed && styles.pressed]} onPress={() => submit(prompt)}>
            <Text style={styles.promptText}>{prompt}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.conversation}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{answer.question}</Text>
        </View>
        <View style={styles.shepherdBubble}>
          <View style={styles.bubbleHeader}>
            <Sparkles color={colors.sage} size={18} />
            <Text style={styles.bubbleKicker}>Shepherd</Text>
          </View>
          <Text style={styles.answerText}>{answer.response}</Text>
        </View>
      </View>

      {answer.intent ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Helpful next step</Text>
          <IntentActionCard suggestion={answer.intent} />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What I found</Text>
        <Text style={styles.sectionSubtitle}>Not just files. These are saved things with context attached.</Text>
        <View style={styles.results}>
          {isLoading ? (
            <View style={styles.emptyCard}>
              <Sparkles color={colors.sage} size={24} />
              <Text style={styles.emptyTitle}>Shepherd is opening your memory.</Text>
              <Text style={styles.emptyBody}>Your private Library is being gathered before I answer.</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyCard}>
              <Sparkles color={colors.sage} size={24} />
              <Text style={styles.emptyTitle}>I could not open your Library yet.</Text>
              <Text style={styles.emptyBody}>{error}</Text>
            </View>
          ) : relatedItems.length ? (
            relatedItems.map((item) => item && <LibraryItemCard key={item.id} item={item} />)
          ) : (
            <View style={styles.emptyCard}>
              <Sparkles color={colors.sage} size={24} />
              <Text style={styles.emptyTitle}>{items.length ? "Try asking another way." : "Your memory is ready for its first saved thing."}</Text>
              <Text style={styles.emptyBody}>
                {items.length
                  ? "Shepherd understands recipes, trips, ideas, quotes, people, sources, and themes."
                  : "Capture a link, idea, recipe, quote, or document first. Then Shepherd can find it here by meaning."}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Follow-up questions</Text>
        <View style={styles.followUps}>
          {answer.suggestedFollowUps.map((followUp) => (
            <Pressable key={followUp} style={styles.followUp} onPress={() => submit(followUp)}>
              <Text style={styles.followUpText}>{followUp}</Text>
              <ChevronRight color={colors.muted} size={16} />
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    marginTop: spacing.md
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
  askBox: {
    minHeight: 62,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    ...shadows.soft
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.ink
  },
  askButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center"
  },
  promptRow: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingRight: spacing.lg
  },
  promptChip: {
    maxWidth: 250,
    borderRadius: radii.pill,
    backgroundColor: colors.mist,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.quiet
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  },
  promptText: {
    ...typography.bodySmall,
    color: colors.ink
  },
  conversation: {
    gap: spacing.md
  },
  userBubble: {
    alignSelf: "flex-end",
    maxWidth: "88%",
    borderRadius: radii.xl,
    borderBottomRightRadius: radii.md,
    backgroundColor: colors.ink,
    padding: spacing.lg,
    ...shadows.quiet
  },
  userText: {
    ...typography.body,
    color: colors.cream
  },
  shepherdBubble: {
    borderRadius: radii.xl,
    borderBottomLeftRadius: radii.md,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.quiet
  },
  bubbleHeader: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center"
  },
  bubbleKicker: {
    ...typography.label,
    color: colors.sage
  },
  answerText: {
    ...typography.body,
    color: colors.ink
  },
  section: {
    marginTop: spacing.xl,
    gap: spacing.md
  },
  sectionTitle: {
    ...typography.cardTitle,
    color: colors.ink
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  results: {
    gap: spacing.lg
  },
  emptyCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: "center",
    ...shadows.quiet
  },
  emptyTitle: {
    ...typography.cardTitle,
    color: colors.ink,
    textAlign: "center"
  },
  emptyBody: {
    ...typography.bodySmall,
    color: colors.subtle,
    textAlign: "center"
  },
  followUps: {
    gap: spacing.md
  },
  followUp: {
    minHeight: 56,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadows.quiet
  },
  followUpText: {
    ...typography.button,
    color: colors.ink,
    flex: 1
  }
});
