import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, Film, Sparkles } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { TimelineChapterCard } from "@/components/TimelineChapterCard";
import { digitalLifeChapters, timelineArc } from "@/features/timeline/mockTimeline";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function LifeTimelineScreen() {
  return (
    <Screen scroll>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft color={colors.ink} size={22} />
      </Pressable>
      <View style={styles.header}>
        <View style={styles.heroIcon}><Film color={colors.sage} size={30} /></View>
        <Text style={styles.kicker}>Your Digital Life</Text>
        <Text style={styles.title}>The story of what held your attention.</Text>
        <Text style={styles.subtitle}>A quiet documentary made from what you saved, created, revisited, and slowly became.</Text>
      </View>
      <View style={styles.arcCard}>
        <Sparkles color={colors.cream} size={24} />
        <Text style={styles.arcLabel}>The story so far</Text>
        <Text style={styles.arcTitle}>{timelineArc.title}</Text>
        <Text style={styles.arcBody}>{timelineArc.body}</Text>
      </View>
      <View style={styles.chapterHeader}>
        <Text style={styles.chapterKicker}>Chapters</Text>
        <Text style={styles.chapterTitle}>How your focus evolved</Text>
      </View>
      <View>
        {digitalLifeChapters.map((chapter, index) => (
          <TimelineChapterCard key={chapter.id} chapter={chapter} isLast={index === digitalLifeChapters.length - 1} />
        ))}
      </View>
      <View style={styles.closingCard}>
        <Text style={styles.closingKicker}>A note from Shepherd</Text>
        <Text style={styles.closingTitle}>You are not the same person who saved the first thing in this timeline.</Text>
        <Text style={styles.closingBody}>Your interests became intentions. Your intentions became small plans. The timeline keeps the thread visible without deciding the meaning for you.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: { width: 46, height: 46, borderRadius: 18, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", marginTop: spacing.sm, ...shadows.quiet },
  header: { gap: spacing.md, marginTop: spacing.xl },
  heroIcon: { width: 68, height: 68, borderRadius: 26, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center", ...shadows.quiet },
  kicker: { ...typography.label, color: colors.sage },
  title: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.body, color: colors.subtle },
  arcCard: { borderRadius: radii.xl, backgroundColor: colors.ink, padding: spacing.xl, gap: spacing.md, marginTop: spacing.xl, ...shadows.soft },
  arcLabel: { ...typography.label, color: colors.mist },
  arcTitle: { ...typography.subtitle, color: colors.cream },
  arcBody: { ...typography.body, color: colors.cream },
  chapterHeader: { gap: spacing.xs, marginTop: spacing.xl, marginBottom: spacing.lg },
  chapterKicker: { ...typography.label, color: colors.sage },
  chapterTitle: { ...typography.subtitle, color: colors.ink },
  closingCard: { borderRadius: radii.xl, backgroundColor: colors.mist, padding: spacing.xl, gap: spacing.md, marginTop: spacing.md, ...shadows.quiet },
  closingKicker: { ...typography.label, color: colors.sage },
  closingTitle: { ...typography.subtitle, color: colors.ink },
  closingBody: { ...typography.body, color: colors.subtle }
});

