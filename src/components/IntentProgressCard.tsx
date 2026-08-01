import { StyleSheet, Text, View } from "react-native";
import { ArrowRight, Sparkles } from "lucide-react-native";
import { intentProgress } from "@/features/intent/mockIntentEngine";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export function IntentProgressCard() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Sparkles color={colors.cream} size={24} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.kicker}>Intent Engine</Text>
          <Text style={styles.title}>From saving to understanding to doing.</Text>
        </View>
      </View>
      <View style={styles.flow}>
        <Step value={intentProgress.saved} label="Saved" />
        <ArrowRight color={colors.mist} size={18} />
        <Step value={intentProgress.understood} label="Understood" />
        <ArrowRight color={colors.mist} size={18} />
        <Step value={intentProgress.inMotion} label="In motion" />
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(intentProgress.completion * 100)}%` }]} />
      </View>
      <Text style={styles.body}>Shepherd is finding repeated interests, forgotten saves, and gentle next steps.</Text>
    </View>
  );
}

function Step({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.step}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadows.soft
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
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  kicker: {
    ...typography.label,
    color: colors.mist
  },
  title: {
    ...typography.cardTitle,
    color: colors.cream
  },
  flow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  step: {
    flex: 1
  },
  value: {
    ...typography.subtitle,
    color: colors.cream
  },
  label: {
    ...typography.bodySmall,
    color: colors.mist
  },
  progressTrack: {
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: "#334447",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.mist
  },
  body: {
    ...typography.bodySmall,
    color: colors.cream
  }
});
