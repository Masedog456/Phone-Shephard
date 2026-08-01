import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, Compass, Sparkles } from "lucide-react-native";
import { ConnectedPattern } from "@/types/domain";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export function ConnectedPatternCard({ pattern, onPress }: { pattern: ConnectedPattern; onPress?: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Compass color={colors.sage} size={23} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.kicker}>{pattern.totalItems} connected saves</Text>
          <Text style={styles.title}>{pattern.title}</Text>
        </View>
        {onPress ? <ChevronRight color={colors.muted} size={18} /> : null}
      </View>

      <Text style={styles.insight}>{pattern.insight}</Text>

      <View style={styles.evidenceRow}>
        {pattern.evidence.slice(0, 3).map((item) => (
          <View key={item.label} style={styles.evidencePill}>
            <Text style={styles.evidenceCount}>{item.count}</Text>
            <Text style={styles.evidenceLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionBox}>
        <Sparkles color={colors.sage} size={16} />
        <Text style={styles.actionText}>{pattern.suggestedAction}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.soft
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  header: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center"
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 21,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  kicker: {
    ...typography.label,
    color: colors.sage
  },
  title: {
    ...typography.cardTitle,
    color: colors.ink
  },
  insight: {
    ...typography.body,
    color: colors.subtle
  },
  evidenceRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  evidencePill: {
    flex: 1,
    borderRadius: radii.lg,
    backgroundColor: colors.cardSoft,
    padding: spacing.md,
    gap: spacing.xs
  },
  evidenceCount: {
    ...typography.subtitle,
    color: colors.ink
  },
  evidenceLabel: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  actionBox: {
    borderRadius: radii.xl,
    backgroundColor: colors.mist,
    padding: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center"
  },
  actionText: {
    ...typography.bodySmall,
    color: colors.ink,
    flex: 1
  }
});
