import { StyleSheet, Text, View } from "react-native";
import { ShieldCheck, TriangleAlert } from "lucide-react-native";
import { ShepherdTaskResult } from "@/types/domain";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export function TaskResultCard({ result }: { result: ShepherdTaskResult }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.source}>{result.sourceLabel}</Text>
          <Text style={styles.title}>{result.title}</Text>
        </View>
        {result.isSensitive && <TriangleAlert color={colors.warning} size={20} />}
      </View>
      <Text style={styles.preview}>{result.preview}</Text>
      <View style={styles.reasonBox}>
        <ShieldCheck color={colors.sage} size={18} />
        <Text style={styles.reason}>{result.reason}</Text>
      </View>
      {result.integrationStatus === "coming_soon" && <Text style={styles.comingSoon}>Shepherd access coming soon</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.quiet
  },
  header: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start"
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  source: {
    ...typography.label,
    color: colors.sage
  },
  title: {
    ...typography.cardTitle,
    color: colors.ink
  },
  preview: {
    ...typography.body,
    color: colors.subtle
  },
  reasonBox: {
    borderRadius: radii.lg,
    backgroundColor: colors.mist,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start"
  },
  reason: {
    ...typography.bodySmall,
    color: colors.ink,
    flex: 1
  },
  comingSoon: {
    ...typography.bodySmall,
    color: colors.blue
  }
});
