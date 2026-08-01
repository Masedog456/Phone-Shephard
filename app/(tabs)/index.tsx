import { router } from "expo-router";
import { useEffect, useRef } from "react";
import type React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import {
  BookOpen,
  Brain,
  Camera,
  ChevronRight,
  FileText,
  Globe,
  HeartPulse,
  Images,
  Inbox,
  Link as LinkIcon,
  LockKeyhole,
  Plus,
  Quote,
  Search,
  Sparkles,
  TrendingUp
} from "lucide-react-native";
import { ForgottenTreasureCard } from "@/components/ForgottenTreasureCard";
import { Screen } from "@/components/Screen";
import { SourceTile } from "@/components/SourceTile";
import { forgottenTreasures, monthlyReport } from "@/features/insights/digitalLifeInsights";
import { useMediaScan } from "@/features/media/useMediaScan";
import { useShepherdTasks } from "@/features/tasks/useShepherdTasks";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function HomeScreen() {
  const { stats } = useMediaScan();
  const tasks = useShepherdTasks((state) => state.tasks);
  const progress = useRef(new Animated.Value(0)).current;
  const screenshotCount = Math.max(stats.screenshots, 147);
  const notesCount = tasks.find((task) => task.source === "notes")?.resultCount ?? 12;
  const savedPostsCount = tasks.find((task) => task.source === "saved_posts")?.resultCount ?? 24;
  const oldTabsCount = tasks.find((task) => task.source === "tabs")?.resultCount ?? 39;
  const greeting = getTimeGreeting();

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 82,
      duration: 900,
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
        <Text style={styles.kicker}>{greeting}</Text>
        <Text style={styles.title}>Your digital world has been busy.</Text>
        <Text style={styles.subtitle}>I found a few saved things worth your attention today. Nothing changes unless you approve it.</Text>
      </View>

      <View style={styles.wellnessCard}>
        <View style={styles.scoreRow}>
          <View style={styles.scoreBadge}>
            <HeartPulse color={colors.sage} size={26} />
          </View>
          <View style={styles.scoreCopy}>
            <Text style={styles.scoreLabel}>Digital Wellness</Text>
            <Text style={styles.score}>82/100</Text>
          </View>
          <View style={styles.improvementPill}>
            <TrendingUp color={colors.sage} size={16} />
            <Text style={styles.improvementText}>+7 this week</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>

        <View style={styles.celebrationNote}>
          <Sparkles color={colors.sage} size={16} />
          <Text style={styles.wellnessText}>A little more peace than last week.</Text>
        </View>
      </View>

      <View style={styles.insightPanel}>
        <Text style={styles.panelKicker}>Today I noticed</Text>
        <InsightRow icon={<Images color={colors.sage} size={20} />} value={`${screenshotCount} moments that may be easier to organize`} />
        <InsightRow icon={<Globe color={colors.blue} size={20} />} value={`${oldTabsCount} research paths waiting to be revisited`} />
        <InsightRow icon={<BookOpen color={colors.clay} size={20} />} value={`${notesCount} ideas that may be worth growing`} />
        <InsightRow icon={<FileText color={colors.ink} size={20} />} value={`${savedPostsCount} pieces of inspiration saved for a reason`} />
      </View>

      <Pressable style={styles.captureCard} onPress={() => router.push("/capture")}>
        <View style={styles.captureIcon}>
          <Inbox color={colors.sage} size={24} />
        </View>
        <View style={styles.captureCopy}>
          <Text style={styles.captureKicker}>Capture anything</Text>
          <Text style={styles.captureTitle}>Found something valuable?</Text>
          <Text style={styles.captureText}>Share it to Shepherd, and I will remember what it is, why it matters, and where it belongs.</Text>
        </View>
        <ChevronRight color={colors.muted} size={18} />
      </Pressable>

      <Pressable style={styles.intentCard} onPress={() => router.push("/library")}>
        <View style={styles.intentTop}>
          <Sparkles color={colors.cream} size={22} />
          <Text style={styles.intentKicker}>Intent Engine</Text>
        </View>
        <Text style={styles.intentTitle}>I found a few saved things ready to become action.</Text>
        <Text style={styles.intentText}>Recipes into meal plans, workouts into reminders, ideas into themes, travel saves into itineraries.</Text>
      </Pressable>

      <Pressable style={styles.dotsCard} onPress={() => router.push("/dots")}>
        <View style={styles.dotsTop}>
          <Brain color={colors.cream} size={22} />
          <Text style={styles.dotsKicker}>Connect the Dots</Text>
        </View>
        <Text style={styles.dotsTitle}>I found patterns across your saved world.</Text>
        <Text style={styles.dotsText}>Business ideas, fitness goals, and travel dreams are starting to take shape.</Text>
      </Pressable>

      <Pressable style={styles.primaryCard} onPress={() => router.push("/session")}>
        <View style={styles.iconCircle}>
          <Sparkles color={colors.cream} size={24} />
        </View>
        <View style={styles.primaryCopy}>
          <Text style={styles.cardTitle}>Begin 3-Minute Reset</Text>
          <Text style={styles.cardText}>Review a small, safe set of saved things and leave feeling lighter.</Text>
        </View>
        <ChevronRight color={colors.cream} size={22} />
      </Pressable>

      <View style={styles.featureHeader}>
        <View>
          <Text style={styles.sectionTitle}>Forgotten treasures</Text>
          <Text style={styles.sectionSubtitle}>Meaningful things you already saved.</Text>
        </View>
        <Pressable style={styles.textButton} onPress={() => router.push("/treasures")}>
          <Text style={styles.textButtonLabel}>View</Text>
          <ChevronRight color={colors.sage} size={16} />
        </Pressable>
      </View>

      <ForgottenTreasureCard treasure={forgottenTreasures[0]} onPress={() => router.push("/treasures")} />

      <Pressable style={styles.reportCard} onPress={() => router.push("/report/monthly")}>
        <View style={styles.reportIcon}>
          <Quote color={colors.blue} size={22} />
        </View>
        <View style={styles.reportCopy}>
          <Text style={styles.reportKicker}>{monthlyReport.month} Digital Life Report</Text>
          <Text style={styles.reportTitle}>{monthlyReport.headline}</Text>
          <Text style={styles.reportText}>See what you rediscovered, protected, and made easier to find.</Text>
        </View>
        <ChevronRight color={colors.muted} size={18} />
      </Pressable>

      <Text style={styles.sectionTitle}>What would you like help understanding?</Text>

      <View style={styles.sourceGrid}>
        <SourceTile
          icon={<Camera color={colors.ink} size={20} />}
          title="Memory Shepherd"
          body="Protect meaningful photos while gently noticing what can breathe."
          onPress={() => router.push("/cleanup")}
        />
        <SourceTile
          icon={<Images color={colors.ink} size={20} />}
          title="Screenshot Shepherd"
          body="Read the story inside recipes, travel plans, ideas, quotes, and purchases."
          onPress={() => router.push("/screenshots")}
        />
        <SourceTile
          icon={<Globe color={colors.ink} size={20} />}
          title="Research Shepherd"
          body="Remember the research paths you intended to return to."
          badge="Coming Soon"
          onPress={() => router.push("/tasks/task-tabs-stale")}
        />
        <SourceTile
          icon={<BookOpen color={colors.ink} size={20} />}
          title="Idea Shepherd"
          body="Bring back thoughts and sparks that may be worth growing."
          badge="Coming Soon"
          onPress={() => router.push("/tasks/task-notes-ideas")}
        />
        <SourceTile
          icon={<FileText color={colors.ink} size={20} />}
          title="Inspiration Shepherd"
          body="Turn saved inspiration into themes you can return to."
          badge="Coming Soon"
          onPress={() => router.push("/tasks/task-posts-fitness")}
        />
        <SourceTile
          icon={<Plus color={colors.ink} size={20} />}
          title="Create a Shepherd"
          body="Give a new caretaker one part of your digital life to watch over."
          onPress={() => router.push("/tasks/create")}
        />
      </View>

      <View style={styles.actionGrid}>
        <HomeAction icon={<LinkIcon color={colors.ink} size={20} />} title="Shepherds" onPress={() => router.push("/tasks")} />
        <HomeAction icon={<BookOpen color={colors.ink} size={20} />} title="Universal Library" onPress={() => router.push("/library")} />
        <HomeAction icon={<Search color={colors.ink} size={20} />} title="Ask Your Memory" onPress={() => router.push("/search")} />
        <HomeAction icon={<Inbox color={colors.ink} size={20} />} title="Capture inbox" onPress={() => router.push("/capture")} />
        <HomeAction icon={<Sparkles color={colors.ink} size={20} />} title="Shepherd session" onPress={() => router.push("/session")} />
        <HomeAction icon={<LockKeyhole color={colors.ink} size={20} />} title="Privacy settings" onPress={() => router.push("/settings/privacy")} />
      </View>
    </Screen>
  );
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning.";
  }
  if (hour < 18) {
    return "Good afternoon.";
  }
  return "Good evening.";
}

function InsightRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <View style={styles.insightRow}>
      <View style={styles.insightIcon}>{icon}</View>
      <Text style={styles.insightText}>{value}</Text>
    </View>
  );
}

function HomeAction({ icon, title, onPress }: { icon: React.ReactNode; title: string; onPress: () => void }) {
  return (
    <Pressable style={styles.action} onPress={onPress}>
      {icon}
      <Text style={styles.actionText}>{title}</Text>
      <ChevronRight color={colors.muted} size={18} />
    </Pressable>
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
  wellnessCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.lg,
    marginTop: spacing.xl,
    ...shadows.soft
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  scoreBadge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
  },
  scoreCopy: {
    flex: 1
  },
  scoreLabel: {
    ...typography.label,
    color: colors.sage
  },
  score: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "800",
    letterSpacing: 0,
    color: colors.ink
  },
  improvementPill: {
    minHeight: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.mist,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  improvementText: {
    ...typography.bodySmall,
    color: colors.sage
  },
  progressTrack: {
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.cardSoft,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.sage
  },
  celebrationNote: {
    borderRadius: radii.pill,
    backgroundColor: colors.mist,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs
  },
  wellnessText: {
    ...typography.body,
    color: colors.subtle
  },
  insightPanel: {
    borderRadius: radii.xl,
    backgroundColor: colors.cardSoft,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.lg,
    ...shadows.quiet
  },
  panelKicker: {
    ...typography.label,
    color: colors.sage
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  insightIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center"
  },
  insightText: {
    ...typography.body,
    color: colors.ink,
    flex: 1
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
  featureHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.xl,
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
  sourceGrid: {
    gap: spacing.md,
    marginTop: spacing.md
  },
  primaryCard: {
    minHeight: 152,
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    ...shadows.soft
  },
  intentCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.sage,
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.lg,
    ...shadows.soft
  },
  intentTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  intentKicker: {
    ...typography.label,
    color: colors.cream
  },
  intentTitle: {
    ...typography.subtitle,
    color: colors.cream
  },
  intentText: {
    ...typography.bodySmall,
    color: colors.cream
  },
  dotsCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.lg,
    ...shadows.soft
  },
  dotsTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  dotsKicker: {
    ...typography.label,
    color: colors.cream
  },
  dotsTitle: {
    ...typography.subtitle,
    color: colors.cream
  },
  dotsText: {
    ...typography.bodySmall,
    color: colors.cream
  },
  captureCard: {
    minHeight: 150,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    ...shadows.soft
  },
  captureIcon: {
    width: 54,
    height: 54,
    borderRadius: 21,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
  },
  captureCopy: {
    flex: 1,
    gap: spacing.xs
  },
  captureKicker: {
    ...typography.label,
    color: colors.sage
  },
  captureTitle: {
    ...typography.cardTitle,
    color: colors.ink
  },
  captureText: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryCopy: {
    flex: 1,
    gap: spacing.xs
  },
  cardTitle: {
    ...typography.cardTitle,
    color: colors.cream
  },
  cardText: {
    ...typography.bodySmall,
    color: colors.cream
  },
  actionGrid: {
    gap: spacing.md,
    marginTop: spacing.xl
  },
  reportCard: {
    minHeight: 128,
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
  action: {
    minHeight: 64,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadows.quiet
  },
  actionText: {
    ...typography.button,
    color: colors.ink,
    flex: 1
  }
});
