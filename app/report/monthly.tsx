import { router } from "expo-router";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, Share2, Sparkles, TrendingUp } from "lucide-react-native";
import { ReportMetricCard } from "@/components/ReportMetricCard";
import { Screen } from "@/components/Screen";
import { monthlyReport } from "@/features/insights/digitalLifeInsights";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function MonthlyReportScreen() {
  const shareReport = async () => {
    await Share.share({ message: monthlyReport.shareText });
  };

  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <Pressable style={styles.shareButton} onPress={shareReport}>
          <Share2 color={colors.cream} size={18} />
          <Text style={styles.shareText}>Share</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.sparkle}>
          <Sparkles color={colors.cream} size={30} />
        </View>
        <Text style={styles.month}>{monthlyReport.month} Report</Text>
        <Text style={styles.title}>{monthlyReport.headline}</Text>
        <Text style={styles.subtitle}>A calm snapshot of what you rediscovered, protected, and brought back under control.</Text>
      </View>

      <View style={styles.metrics}>
        {monthlyReport.metrics.map((metric) => (
          <ReportMetricCard key={metric.id} metric={metric} />
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <TrendingUp color={colors.sage} size={22} />
          <Text style={styles.sectionTitle}>Most saved interests</Text>
        </View>
        <View style={styles.pills}>
          {monthlyReport.interests.map((interest) => (
            <Text key={interest} style={styles.pill}>
              {interest}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal trends</Text>
        {monthlyReport.trends.map((trend) => (
          <View key={trend} style={styles.trendRow}>
            <View style={styles.dot} />
            <Text style={styles.trendText}>{trend}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.quiet
  },
  shareButton: {
    minHeight: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.quiet
  },
  shareText: {
    ...typography.button,
    color: colors.cream
  },
  hero: {
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.xl,
    ...shadows.soft
  },
  sparkle: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center"
  },
  month: {
    ...typography.label,
    color: colors.mist
  },
  title: {
    ...typography.hero,
    color: colors.cream
  },
  subtitle: {
    ...typography.body,
    color: colors.cream
  },
  metrics: {
    gap: spacing.lg,
    marginTop: spacing.xl
  },
  section: {
    borderRadius: radii.xl,
    backgroundColor: colors.cardSoft,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.xl,
    ...shadows.quiet
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  sectionTitle: {
    ...typography.cardTitle,
    color: colors.ink
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  pill: {
    ...typography.bodySmall,
    color: colors.ink,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  trendRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start"
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.sage,
    marginTop: 7
  },
  trendText: {
    ...typography.body,
    color: colors.subtle,
    flex: 1
  }
});
