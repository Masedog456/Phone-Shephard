import { StyleSheet, Text, View } from "react-native";
import type { ReportMetric } from "@/features/insights/digitalLifeInsights";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export function ReportMetricCard({ metric }: { metric: ReportMetric }) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{metric.value}</Text>
      <Text style={styles.label}>{metric.label}</Text>
      <Text style={styles.caption}>{metric.caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.quiet
  },
  value: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "800",
    letterSpacing: 0,
    color: colors.ink
  },
  label: {
    ...typography.cardTitle,
    color: colors.ink
  },
  caption: {
    ...typography.bodySmall,
    color: colors.subtle
  }
});
