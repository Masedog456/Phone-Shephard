import { Pressable, StyleSheet, Text, View } from "react-native";
import { BookOpen, ChevronRight, Sparkles } from "lucide-react-native";
import { LibraryItem } from "@/types/domain";
import { categoryLabels } from "@/features/library/mockLibrary";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export function LibraryItemCard({ item, onPress }: { item: LibraryItem; onPress?: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.iconWrap}>
        <BookOpen color={colors.sage} size={22} />
      </View>
      <View style={styles.copy}>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{categoryLabels[item.category]}</Text>
          <Text style={styles.dot}>.</Text>
          <Text style={styles.meta}>Source: {item.source}</Text>
          <Text style={styles.dot}>.</Text>
          <Text style={styles.meta}>Type: {item.type}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.summaryLabel}>AI Summary</Text>
        <Text style={styles.summary}>{item.aiSummary}</Text>
        <View style={styles.whyBox}>
          <Sparkles color={colors.sage} size={15} />
          <Text style={styles.whyText}>Why you saved it: {item.whySaved}</Text>
        </View>
        <Text style={styles.actionLabel}>Suggested action</Text>
        <Text style={styles.action}>{item.suggestedAction}</Text>
      </View>
      {onPress ? <ChevronRight color={colors.muted} size={18} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    ...shadows.quiet
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
    gap: spacing.xs
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs
  },
  category: {
    ...typography.label,
    color: colors.sage
  },
  meta: {
    ...typography.bodySmall,
    color: colors.muted
  },
  dot: {
    ...typography.bodySmall,
    color: colors.muted
  },
  title: {
    ...typography.cardTitle,
    color: colors.ink
  },
  summary: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  summaryLabel: {
    ...typography.label,
    color: colors.sage,
    marginTop: spacing.xs
  },
  whyBox: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    backgroundColor: colors.mist,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  whyText: {
    ...typography.bodySmall,
    color: colors.ink
  },
  action: {
    ...typography.bodySmall,
    color: colors.blue,
  },
  actionLabel: {
    ...typography.label,
    color: colors.sage,
    marginTop: spacing.xs
  }
});
