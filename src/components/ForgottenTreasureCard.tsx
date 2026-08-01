import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { ForgottenTreasure } from "@/features/insights/digitalLifeInsights";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export function ForgottenTreasureCard({
  treasure,
  onPress
}: {
  treasure: ForgottenTreasure;
  onPress?: () => void;
}) {
  const Icon = treasure.icon;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.icon, { backgroundColor: `${treasure.color}22` }]}>
        <Icon color={treasure.color} size={22} />
      </View>
      <View style={styles.copy}>
        <View style={styles.metaRow}>
          <Text style={styles.source}>{treasure.source}</Text>
          <Text style={styles.pill}>{treasure.whyItMatters}</Text>
        </View>
        <Text style={styles.title}>{treasure.title}</Text>
        <Text style={styles.description}>{treasure.description}</Text>
      </View>
      {onPress ? <ChevronRight color={colors.muted} size={18} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 138,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    ...shadows.quiet
  },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  source: {
    ...typography.label,
    color: colors.sage
  },
  pill: {
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
  description: {
    ...typography.bodySmall,
    color: colors.subtle
  }
});
