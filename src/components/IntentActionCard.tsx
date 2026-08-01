import { Pressable, StyleSheet, Text, View } from "react-native";
import { Bell, CheckCircle2, ChevronRight, Sparkles } from "lucide-react-native";
import { IntentSuggestion } from "@/types/domain";
import { categoryLabels } from "@/features/library/mockLibrary";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export function IntentActionCard({ suggestion }: { suggestion: IntentSuggestion }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.iconWrap}>
        <Sparkles color={colors.sage} size={22} />
      </View>
      <View style={styles.copy}>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{categoryLabels[suggestion.category]}</Text>
          <Text style={styles.kind}>{labelForKind(suggestion.kind)}</Text>
        </View>
        <Text style={styles.title}>{suggestion.title}</Text>
        <Text style={styles.insight}>{suggestion.insight}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(suggestion.progress * 100)}%` }]} />
        </View>
        <View style={styles.footer}>
          <View style={styles.actionPill}>
            <CheckCircle2 color={colors.sage} size={15} />
            <Text style={styles.actionText}>{suggestion.suggestedAction}</Text>
          </View>
          {suggestion.reminder ? (
            <View style={styles.reminderPill}>
              <Bell color={colors.blue} size={15} />
              <Text style={styles.reminderText}>{suggestion.reminder}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <ChevronRight color={colors.muted} size={18} />
    </Pressable>
  );
}

function labelForKind(kind: IntentSuggestion["kind"]) {
  switch (kind) {
    case "forgotten":
      return "Forgotten";
    case "repeated_interest":
      return "Pattern";
    case "pattern":
      return "Theme";
    case "next_step":
      return "Next step";
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    ...shadows.soft
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    gap: spacing.sm
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center"
  },
  category: {
    ...typography.label,
    color: colors.sage
  },
  kind: {
    ...typography.bodySmall,
    color: colors.blue,
    backgroundColor: colors.cardSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  title: {
    ...typography.cardTitle,
    color: colors.ink
  },
  insight: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  progressTrack: {
    height: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.cardSoft,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.sage
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  actionPill: {
    minHeight: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.mist,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  actionText: {
    ...typography.bodySmall,
    color: colors.ink
  },
  reminderPill: {
    minHeight: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.cardSoft,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  reminderText: {
    ...typography.bodySmall,
    color: colors.blue
  }
});
