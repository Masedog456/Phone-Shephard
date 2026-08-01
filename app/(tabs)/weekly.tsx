import { router } from "expo-router";
import { useEffect, useRef } from "react";
import type React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { CalendarCheck, ChevronRight, HeartPulse, RotateCcw, Sparkles } from "lucide-react-native";
import { ForgottenTreasureCard } from "@/components/ForgottenTreasureCard";
import { Screen } from "@/components/Screen";
import { StatTile } from "@/components/StatTile";
import { forgottenTreasures, monthlyReport, weeklyInsights } from "@/features/insights/digitalLifeInsights";
import { useMediaScan } from "@/features/media/useMediaScan";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function ResetScreen() {
  const { stats } = useMediaScan();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 82,
      duration: 1000,
      useNativeDriver: false
    }).start();
  }, [progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"]
  });

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.kicker}>Weekly Reset</Text>
        <Text style={styles.title}>A Sunday ritual for your saved world.</Text>
        <Text style={styles.subtitle}>
          Take a quiet moment to protect memories, rediscover ideas, and give your digital life a little more room to breathe.
        </Text>
      </View>

      <View style={styles.ritualCard}>
        <View style={styles.ritualTop}>
          <View style={styles.ritualIcon}>
            <HeartPulse color={colors.cream} size={28} />
          </View>
          <View style={styles.ritualCopy}>
            <Text style={styles.ritualLabel}>Digital Wellness</Text>
            <Text style={styles.ritualScore}>82/100</Text>
          </View>
          <Text style={styles.weekPill}>+7</Text>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.ritualText}>I will start with a small, safe set. You approve every keep, archive, reminder, or release.</Text>
      </View>

      <Pressable style={styles.primaryButton} onPress={() => router.push("/session")}>
        <Sparkles color={colors.cream} size={20} />
        <Text style={styles.primaryText}>Begin 3-Minute Reset</Text>
      </Pressable>

      <View style={styles.stats}>
        <StatTile label="Memories protected" value="12" />
        <StatTile label="Ideas rediscovered" value="3" />
        <StatTile label="Gentle findings" value={Math.max(stats.toReview, 42).toString()} />
      </View>

      <Text style={styles.sectionTitle}>This week I noticed</Text>
      <View style={styles.insights}>
        {weeklyInsights.map((insight) => (
          <WeeklyInsightRow key={insight.id} value={insight.value} label={insight.label} tone={insight.tone} />
        ))}
      </View>

      <View style={styles.featureHeader}>
        <View>
          <Text style={styles.sectionTitle}>Forgotten treasures</Text>
          <Text style={styles.sectionSubtitle}>Small rediscoveries that make the app worth returning to.</Text>
        </View>
        <Pressable style={styles.textButton} onPress={() => router.push("/treasures")}>
          <Text style={styles.textButtonLabel}>View</Text>
          <ChevronRight color={colors.sage} size={16} />
        </Pressable>
      </View>
      <ForgottenTreasureCard treasure={forgottenTreasures[1]} onPress={() => router.push("/treasures")} />

      <Pressable style={styles.reportCard} onPress={() => router.push("/report/monthly")}>
        <View style={styles.reportIcon}>
          <CalendarCheck color={colors.blue} size={22} />
        </View>
        <View style={styles.reportCopy}>
          <Text style={styles.reportKicker}>{monthlyReport.month} Digital Life Report</Text>
          <Text style={styles.reportTitle}>A beautiful snapshot of your month.</Text>
          <Text style={styles.reportText}>Interests saved, memories rediscovered, ideas collected, and space made peaceful.</Text>
        </View>
        <ChevronRight color={colors.muted} size={18} />
      </Pressable>

      <View style={styles.steps}>
        <ResetStep icon={<RotateCcw color={colors.sage} size={20} />} text="Begin with the safest, recent saved things." />
        <ResetStep icon={<Sparkles color={colors.clay} size={20} />} text="Bring back the memories, ideas, and inspiration that still matter." />
        <ResetStep icon={<CalendarCheck color={colors.blue} size={20} />} text="End with a meaningful summary of the care you gave." />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryKicker}>After today's reset</Text>
        <Text style={styles.summaryTitle}>You protected 12 memories, rediscovered 3 ideas, and gave your digital life a little more space to breathe.</Text>
      </View>
    </Screen>
  );
}

function WeeklyInsightRow({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <View style={styles.insightRow}>
      <Text style={styles.insightValue}>{value}</Text>
      <View style={styles.insightCopy}>
        <Text style={styles.insightLabel}>{label}</Text>
        <Text style={styles.insightTone}>{tone}</Text>
      </View>
    </View>
  );
}

function ResetStep({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepIcon}>{icon}</View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    marginTop: spacing.md
  },
  kicker: {
    ...typography.label,
    color: colors.sage
  },
  title: {
    ...typography.title,
    color: colors.ink
  },
  subtitle: {
    ...typography.body,
    color: colors.subtle
  },
  ritualCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    padding: spacing.lg,
    gap: spacing.lg,
    marginTop: spacing.xl,
    ...shadows.soft
  },
  ritualTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  ritualIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center"
  },
  ritualCopy: {
    flex: 1
  },
  ritualLabel: {
    ...typography.label,
    color: colors.mist
  },
  ritualScore: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "800",
    letterSpacing: 0,
    color: colors.cream
  },
  weekPill: {
    ...typography.button,
    color: colors.cream,
    backgroundColor: colors.sage,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  progressTrack: {
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: "#334447",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.mist
  },
  ritualText: {
    ...typography.body,
    color: colors.cream
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: radii.pill,
    backgroundColor: colors.sage,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    ...shadows.soft
  },
  primaryText: {
    ...typography.button,
    color: colors.cream
  },
  stats: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl
  },
  sectionTitle: {
    ...typography.cardTitle,
    color: colors.ink,
    marginTop: spacing.xl
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.subtle,
    marginTop: spacing.xs
  },
  insights: {
    gap: spacing.md,
    marginTop: spacing.md
  },
  insightRow: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    ...shadows.quiet
  },
  insightValue: {
    minWidth: 58,
    ...typography.subtitle,
    color: colors.sage
  },
  insightCopy: {
    flex: 1,
    gap: spacing.xs
  },
  insightLabel: {
    ...typography.cardTitle,
    color: colors.ink
  },
  insightTone: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  featureHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md
  },
  textButton: {
    minHeight: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.mist,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  textButtonLabel: {
    ...typography.button,
    color: colors.sage
  },
  reportCard: {
    minHeight: 132,
    borderRadius: radii.xl,
    backgroundColor: colors.cardSoft,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    ...shadows.quiet
  },
  reportIcon: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center"
  },
  reportCopy: {
    flex: 1,
    gap: spacing.xs
  },
  reportKicker: {
    ...typography.label,
    color: colors.blue
  },
  reportTitle: {
    ...typography.cardTitle,
    color: colors.ink
  },
  reportText: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  steps: {
    gap: spacing.md,
    marginTop: spacing.xl
  },
  summaryCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.mist,
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.xl,
    ...shadows.soft
  },
  summaryKicker: {
    ...typography.label,
    color: colors.sage
  },
  summaryTitle: {
    ...typography.subtitle,
    color: colors.ink
  },
  step: {
    minHeight: 70,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadows.quiet
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
  },
  stepText: {
    ...typography.body,
    color: colors.ink,
    flex: 1
  }
});
