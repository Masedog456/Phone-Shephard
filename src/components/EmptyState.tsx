import { StyleSheet, Text, View } from "react-native";
import { HeartPulse, Sparkles } from "lucide-react-native";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export function EmptyState({ title, body, examples = [] }: { title: string; body: string; examples?: string[] }) {
  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <HeartPulse color={colors.sage} size={30} />
        <View style={styles.spark}>
          <Sparkles color={colors.clay} size={13} />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {examples.length > 0 && (
        <View style={styles.examples}>
          {examples.map((example) => (
            <View key={example} style={styles.examplePill}>
              <Text style={styles.exampleText}>{example}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    ...shadows.quiet
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
  },
  spark: {
    position: "absolute",
    right: -2,
    top: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.quiet
  },
  title: {
    ...typography.subtitle,
    color: colors.ink,
    textAlign: "center"
  },
  body: {
    ...typography.body,
    color: colors.subtle,
    textAlign: "center"
  },
  examples: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  examplePill: {
    borderRadius: radii.pill,
    backgroundColor: colors.cardSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  exampleText: {
    ...typography.bodySmall,
    color: colors.ink
  }
});
