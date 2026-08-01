import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, Brain, CheckCircle2, ChevronRight, Compass, Film } from "lucide-react-native";
import { ConnectedPatternCard } from "@/components/ConnectedPatternCard";
import { Screen } from "@/components/Screen";
import { connectedPatterns } from "@/features/dots/mockDots";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function ConnectDotsScreen() {
  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
      </View>

      <View style={styles.header}>
        <View style={styles.heroIcon}>
          <Compass color={colors.sage} size={30} />
        </View>
        <Text style={styles.kicker}>Connect the Dots</Text>
        <Text style={styles.title}>Your saved things may be pointing somewhere.</Text>
        <Text style={styles.subtitle}>
          Shepherd looks across videos, notes, articles, screenshots, files, and voice memos to find themes, interests, goals, and unfinished ideas.
        </Text>
      </View>

      <View style={styles.researcherCard}>
        <View style={styles.researcherTop}>
          <Brain color={colors.cream} size={26} />
          <View style={styles.researcherCopy}>
            <Text style={styles.researcherLabel}>Personal researcher</Text>
            <Text style={styles.researcherTitle}>I found {connectedPatterns.length} meaningful patterns across your library.</Text>
          </View>
        </View>
        <Text style={styles.researcherText}>
          These are not folders. They are signals about what you keep returning to, what you may want to build, and what deserves a next step.
        </Text>
      </View>

      <View style={styles.list}>
        {connectedPatterns.map((pattern) => (
          <ConnectedPatternCard key={pattern.id} pattern={pattern} />
        ))}
      </View>

      <View style={styles.detailCard}>
        <Text style={styles.detailKicker}>What Shepherd is looking for</Text>
        <ResearchPoint text="Themes that repeat across unrelated apps." />
        <ResearchPoint text="Interests that may actually be goals." />
        <ResearchPoint text="Unfinished ideas hiding in notes, saves, and voice memos." />
        <ResearchPoint text="Recurring dreams and ambitions worth giving shape." />
      </View>
      <Pressable style={styles.timelineCard} onPress={() => router.push("/timeline")}>
        <Film color={colors.blue} size={24} />
        <View style={styles.timelineCopy}>
          <Text style={styles.timelineKicker}>Life Timeline</Text>
          <Text style={styles.timelineTitle}>See how these patterns changed month by month.</Text>
        </View>
        <ChevronRight color={colors.muted} size={20} />
      </Pressable>
    </Screen>
  );
}

function ResearchPoint({ text }: { text: string }) {
  return (
    <View style={styles.pointRow}>
      <CheckCircle2 color={colors.sage} size={18} />
      <Text style={styles.pointText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    marginTop: spacing.sm
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.quiet
  },
  header: {
    gap: spacing.md,
    marginTop: spacing.xl
  },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 26,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.quiet
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
  researcherCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    padding: spacing.xl,
    gap: spacing.lg,
    marginTop: spacing.xl,
    ...shadows.soft
  },
  researcherTop: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center"
  },
  researcherCopy: {
    flex: 1,
    gap: spacing.xs
  },
  researcherLabel: {
    ...typography.label,
    color: colors.mist
  },
  researcherTitle: {
    ...typography.subtitle,
    color: colors.cream
  },
  researcherText: {
    ...typography.body,
    color: colors.cream
  },
  list: {
    gap: spacing.lg,
    marginTop: spacing.xl
  },
  detailCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.cardSoft,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.xl,
    ...shadows.quiet
  },
  detailKicker: {
    ...typography.label,
    color: colors.sage
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  pointText: {
    ...typography.bodySmall,
    color: colors.ink,
    flex: 1
  },
  timelineCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    ...shadows.quiet
  },
  timelineCopy: {
    flex: 1,
    gap: spacing.xs
  },
  timelineKicker: {
    ...typography.label,
    color: colors.blue
  },
  timelineTitle: {
    ...typography.cardTitle,
    color: colors.ink
  }
});
