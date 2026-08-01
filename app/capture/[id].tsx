import { router, useLocalSearchParams } from "expo-router";
import type React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, CalendarClock, CheckCircle2, Link as LinkIcon, Sparkles, UserRound } from "lucide-react-native";
import { CaptureActionChip } from "@/components/CaptureActionChip";
import { Screen } from "@/components/Screen";
import { captureActionLabels } from "@/features/capture/mockCaptures";
import { useCaptureInbox } from "@/features/capture/useCaptureInbox";
import { useTransformations } from "@/features/transformation/useTransformations";
import { CaptureAction } from "@/types/domain";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

const actions: CaptureAction[] = ["save_later", "add_to_shepherd", "summarize", "remind_later", "create_action_item", "add_to_collection"];

export default function CaptureReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const capture = useCaptureInbox((state) => state.captures.find((item) => item.id === id));
  const selectedAction = useCaptureInbox((state) => state.selectedActionById[id]);
  const chooseAction = useCaptureInbox((state) => state.chooseAction);
  const createFromCapture = useTransformations((state) => state.createFromCapture);
  const isCreating = useTransformations((state) => state.isCreating);

  if (!capture) {
    return (
      <Screen>
        <Text style={styles.title}>This captured thing is not here anymore.</Text>
      </Screen>
    );
  }

  const currentCapture = capture;
  const selected = selectedAction ?? currentCapture.recommendedAction;

  async function handleTransform() {
    try {
      const result = await createFromCapture(currentCapture, selected);
      router.push(`/transformation/${result.id}`);
    } catch (error) {
      Alert.alert("Shepherd needs another moment", error instanceof Error ? error.message : "This transformation could not be created yet.");
    }
  }

  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
      </View>

      <View style={styles.header}>
        <Text style={styles.kicker}>Shepherd noticed</Text>
        <Text style={styles.title}>I found something you may want to remember.</Text>
        <Text style={styles.subtitle}>{capture.preview}</Text>
      </View>

      <View style={styles.analysisCard}>
        <View style={styles.cardTop}>
          <View style={styles.sparkIcon}>
            <Sparkles color={colors.sage} size={24} />
          </View>
          <View style={styles.titleCopy}>
            <Text style={styles.source}>{capture.sourceLabel}</Text>
            <Text style={styles.captureTitle}>{capture.title}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <Meta icon={<UserRound color={colors.sage} size={16} />} label="Creator" value={capture.creator ?? "Unknown"} />
          <Meta icon={<LinkIcon color={colors.sage} size={16} />} label="Link" value={capture.link ?? "Saved locally"} />
          <Meta icon={<CalendarClock color={colors.sage} size={16} />} label="Captured" value={formatDate(capture.capturedAt)} />
        </View>

        <Text style={styles.sectionLabel}>Summary</Text>
        <Text style={styles.summary}>{capture.summary}</Text>

        <Text style={styles.sectionLabel}>Keywords</Text>
        <View style={styles.keywords}>
          {capture.keywords.map((keyword) => (
            <Text key={keyword} style={styles.keyword}>
              {keyword}
            </Text>
          ))}
        </View>

        <View style={styles.shepherdSuggestion}>
          <Text style={styles.shepherdLabel}>Suggested Shepherd</Text>
          <Text style={styles.shepherdName}>{capture.suggestedShepherd}</Text>
        </View>
      </View>

      <View style={styles.actionPanel}>
        <Text style={styles.actionTitle}>What would you like me to do with this?</Text>
        <View style={styles.actions}>
          {actions.map((action) => (
            <CaptureActionChip key={action} action={action} selected={selected === action} onPress={() => chooseAction(capture.id, action)} />
          ))}
        </View>
      </View>

      <View style={styles.doneCard}>
        <CheckCircle2 color={colors.sage} size={24} />
        <View style={styles.doneCopy}>
          <Text style={styles.doneTitle}>{captureActionLabels[selected]}</Text>
          <Text style={styles.doneText}>Shepherd will remember this with almost no manual organization.</Text>
        </View>
      </View>

      <Pressable
        style={styles.transformationButton}
        disabled={isCreating}
        onPress={handleTransform}
      >
        <Sparkles color={colors.cream} size={20} />
        <Text style={styles.transformationText}>{isCreating ? "Creating something useful..." : "See what Shepherd created"}</Text>
      </Pressable>
    </Screen>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.meta}>
      {icon}
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

const styles = StyleSheet.create({
  topRow: {
    marginTop: spacing.sm
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.quiet
  },
  header: {
    gap: spacing.md,
    marginTop: spacing.xl
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
  analysisCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.lg,
    marginTop: spacing.xl,
    ...shadows.soft
  },
  cardTop: {
    flexDirection: "row",
    gap: spacing.md
  },
  sparkIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
  },
  titleCopy: {
    flex: 1,
    gap: spacing.xs
  },
  source: {
    ...typography.label,
    color: colors.sage
  },
  captureTitle: {
    ...typography.subtitle,
    color: colors.ink
  },
  metaGrid: {
    gap: spacing.sm
  },
  meta: {
    minHeight: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.cardSoft,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  metaLabel: {
    ...typography.bodySmall,
    color: colors.muted
  },
  metaValue: {
    ...typography.bodySmall,
    color: colors.ink,
    flex: 1,
    textAlign: "right"
  },
  sectionLabel: {
    ...typography.label,
    color: colors.sage
  },
  summary: {
    ...typography.body,
    color: colors.ink
  },
  keywords: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  keyword: {
    ...typography.bodySmall,
    color: colors.ink,
    backgroundColor: colors.mist,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  shepherdSuggestion: {
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    padding: spacing.lg,
    gap: spacing.xs
  },
  shepherdLabel: {
    ...typography.label,
    color: colors.mist
  },
  shepherdName: {
    ...typography.cardTitle,
    color: colors.cream
  },
  actionPanel: {
    marginTop: spacing.xl,
    gap: spacing.md
  },
  actionTitle: {
    ...typography.cardTitle,
    color: colors.ink
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  doneCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.mist,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
    ...shadows.quiet
  },
  transformationButton: {
    minHeight: 58,
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    ...shadows.soft
  },
  transformationText: {
    ...typography.button,
    color: colors.cream
  },
  doneCopy: {
    flex: 1,
    gap: spacing.xs
  },
  doneTitle: {
    ...typography.cardTitle,
    color: colors.ink
  },
  doneText: {
    ...typography.bodySmall,
    color: colors.subtle
  }
});




