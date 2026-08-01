import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export function CleanupRow({ icon, title, count, savings }: { icon: ReactNode; title: string; count: number; savings: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.icon}>{icon}</View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{count} waiting for your eyes</Text>
      </View>
      <Text style={styles.savings}>{savings}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 92,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadows.quiet
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1
  },
  title: {
    ...typography.cardTitle,
    color: colors.ink
  },
  body: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  savings: {
    ...typography.bodySmall,
    color: colors.sage,
    textAlign: "right"
  }
});
