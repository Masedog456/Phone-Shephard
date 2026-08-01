import { StyleSheet, Text, View } from "react-native";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 88,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.md,
    justifyContent: "space-between",
    ...shadows.quiet
  },
  value: {
    ...typography.subtitle,
    color: colors.ink
  },
  label: {
    ...typography.bodySmall,
    color: colors.subtle
  }
});
