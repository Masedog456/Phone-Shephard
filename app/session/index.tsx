import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from "react-native";
import { CheckCircle2, ChevronRight, HeartPulse, Sparkles, Star } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { SessionRecommendationCard } from "@/components/SessionRecommendationCard";
import {
  getCompletionMessage,
  getSessionProgress,
  shepherdGreeting,
  shepherdRecommendations,
  ShepherdRecommendation,
  ShepherdSessionStep
} from "@/features/session/shepherdSession";
import { useMediaScan } from "@/features/media/useMediaScan";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function ShepherdSessionScreen() {
  const { requestAndScan } = useMediaScan();
  const [step, setStep] = useState<ShepherdSessionStep>("greeting");
  const [selected, setSelected] = useState<ShepherdRecommendation | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(12)).current;

  const progress = getSessionProgress(step);
  const completedCount = completedIds.length;
  const completionMessage = useMemo(() => getCompletionMessage(completedCount), [completedCount]);

  useEffect(() => {
    fade.setValue(0);
    lift.setValue(12);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true
      })
    ]).start();
  }, [fade, lift, step]);

  function startSession() {
    setStep("recommendations");
  }

  function openRecommendation(recommendation: ShepherdRecommendation) {
    setSelected(recommendation);
    setStep("review");
  }

  async function completeRecommendation() {
    if (!selected) {
      return;
    }

    if (selected.source === "screenshots") {
      await requestAndScan();
    }

    setCompletedIds((current) => (current.includes(selected.id) ? current : [...current, selected.id]));
    Vibration.vibrate(8);

    if (completedCount + 1 >= 2) {
      setStep("complete");
      return;
    }

    setSelected(null);
    setStep("recommendations");
  }

  return (
    <Screen>
      <View style={styles.shell}>
        <SessionHeader progress={progress} />
        <Animated.View style={[styles.animated, { opacity: fade, transform: [{ translateY: lift }] }]}>
          {step === "greeting" && <GreetingStep onStart={startSession} />}
          {step === "recommendations" && (
            <RecommendationsStep completedIds={completedIds} onSelect={openRecommendation} onFinish={() => setStep("complete")} />
          )}
          {step === "review" && selected && (
            <ReviewStep recommendation={selected} onComplete={completeRecommendation} onBack={() => setStep("recommendations")} />
          )}
          {step === "complete" && <CompleteStep message={completionMessage} completedCount={completedCount} />}
        </Animated.View>
      </View>
    </Screen>
  );
}

function SessionHeader({ progress }: { progress: number }) {
  return (
    <View style={styles.sessionHeader}>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <HeartPulse color={colors.sage} size={22} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.headerKicker}>Shepherd Session</Text>
          <Text style={styles.headerTitle}>A gentle reset</Text>
        </View>
        <Text style={styles.headerTime}>3-5 min</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </View>
  );
}

function GreetingStep({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.step}>
      <View style={styles.messageBubble}>
        <Text style={styles.salutation}>{shepherdGreeting.salutation}</Text>
        <Text style={styles.message}>{shepherdGreeting.message}</Text>
        <Text style={styles.reassurance}>{shepherdGreeting.reassurance}</Text>
      </View>

      <View style={styles.intentCard}>
        <Sparkles color={colors.sage} size={22} />
        <Text style={styles.intentText}>Today we will look at a few saved things, keep what matters close, and leave the rest for later.</Text>
      </View>

      <Pressable style={styles.primaryButton} onPress={onStart}>
        <Text style={styles.primaryText}>Begin gently</Text>
        <ChevronRight color={colors.cream} size={20} />
      </Pressable>
    </View>
  );
}

function RecommendationsStep({
  completedIds,
  onSelect,
  onFinish
}: {
  completedIds: string[];
  onSelect: (recommendation: ShepherdRecommendation) => void;
  onFinish: () => void;
}) {
  return (
    <View style={styles.step}>
      <ShepherdBubble
        eyebrow="Shepherd"
        message="Here is what may deserve your attention. Choose one small thing, and I will guide the rest."
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cardList}>
        {shepherdRecommendations.map((recommendation) => (
          <SessionRecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            completed={completedIds.includes(recommendation.id)}
            onPress={() => onSelect(recommendation)}
          />
        ))}
      </ScrollView>

      <Pressable style={styles.secondaryButton} onPress={onFinish}>
        <Text style={styles.secondaryText}>That is enough for today</Text>
      </Pressable>
    </View>
  );
}

function ReviewStep({
  recommendation,
  onComplete,
  onBack
}: {
  recommendation: ShepherdRecommendation;
  onComplete: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.step}>
      <ShepherdBubble eyebrow="Shepherd" message={recommendation.message} />

      <View style={styles.userBubble}>
        <Text style={styles.userBubbleText}>{recommendation.title}</Text>
      </View>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewKicker}>What I noticed</Text>
        <Text style={styles.reviewDetail}>{recommendation.detail}</Text>
      </View>

      <View style={styles.reviewCardSoft}>
        <Text style={styles.reviewKicker}>Suggested next step</Text>
        <Text style={styles.reviewDetail}>{recommendation.gentleAction}</Text>
      </View>

      <Pressable style={styles.primaryButton} onPress={onComplete}>
        <Text style={styles.primaryText}>Care for this</Text>
        <CheckCircle2 color={colors.cream} size={20} />
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={onBack}>
        <Text style={styles.secondaryText}>Choose something else</Text>
      </Pressable>
    </View>
  );
}

function CompleteStep({ message, completedCount }: { message: string; completedCount: number }) {
  return (
    <View style={styles.step}>
      <View style={styles.celebrationWrap}>
        <View style={styles.celebrationDotOne} />
        <View style={styles.celebrationDotTwo} />
        <View style={styles.completeMark}>
          <CheckCircle2 color={colors.sage} size={42} />
        </View>
        <View style={styles.starBadge}>
          <Star color={colors.clay} size={18} />
        </View>
      </View>
      <Text style={styles.completeTitle}>You are done for now.</Text>
      <Text style={styles.completeMessage}>{message}</Text>
      <View style={styles.completionSummary}>
        <Text style={styles.summaryText}>
          Today you protected 12 memories, rediscovered 3 ideas, and gave your digital life a little more space to breathe.
        </Text>
      </View>
      <View style={styles.completeStats}>
        <Text style={styles.completeNumber}>{completedCount}</Text>
        <Text style={styles.completeLabel}>cared for today</Text>
      </View>
      <Pressable style={styles.primaryButton} onPress={() => router.replace("/transformation/reset")}>
        <Text style={styles.primaryText}>See what Shepherd created</Text>
        <ChevronRight color={colors.cream} size={20} />
      </Pressable>
    </View>
  );
}

function ShepherdBubble({ eyebrow, message }: { eyebrow: string; message: string }) {
  return (
    <View style={styles.shepherdBubble}>
      <Text style={styles.bubbleEyebrow}>{eyebrow}</Text>
      <Text style={styles.bubbleMessage}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    gap: spacing.lg
  },
  animated: {
    flex: 1
  },
  sessionHeader: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.quiet
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs
  },
  headerKicker: {
    ...typography.label,
    color: colors.sage
  },
  headerTitle: {
    ...typography.cardTitle,
    color: colors.ink
  },
  headerTime: {
    ...typography.bodySmall,
    color: colors.muted
  },
  progressTrack: {
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.cardSoft,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.sage
  },
  step: {
    flex: 1,
    gap: spacing.lg
  },
  messageBubble: {
    borderRadius: radii.xl,
    backgroundColor: colors.cardSoft,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.quiet
  },
  salutation: {
    ...typography.label,
    color: colors.sage
  },
  message: {
    ...typography.title,
    color: colors.ink
  },
  reassurance: {
    ...typography.body,
    color: colors.subtle
  },
  intentCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    ...shadows.quiet
  },
  intentText: {
    ...typography.body,
    color: colors.ink,
    flex: 1
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    ...shadows.soft
  },
  primaryText: {
    ...typography.button,
    color: colors.cream
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    ...shadows.quiet
  },
  secondaryText: {
    ...typography.button,
    color: colors.ink
  },
  sectionTitle: {
    ...typography.title,
    color: colors.ink
  },
  sectionBody: {
    ...typography.body,
    color: colors.subtle
  },
  cardList: {
    gap: spacing.md,
    paddingBottom: spacing.lg
  },
  shepherdBubble: {
    alignSelf: "flex-start",
    maxWidth: "92%",
    borderRadius: radii.xl,
    borderBottomLeftRadius: radii.md,
    backgroundColor: colors.cardSoft,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.quiet
  },
  bubbleEyebrow: {
    ...typography.label,
    color: colors.sage
  },
  bubbleMessage: {
    ...typography.body,
    color: colors.ink
  },
  userBubble: {
    alignSelf: "flex-end",
    maxWidth: "88%",
    borderRadius: radii.xl,
    borderBottomRightRadius: radii.md,
    backgroundColor: colors.ink,
    padding: spacing.lg
  },
  userBubbleText: {
    ...typography.body,
    color: colors.cream
  },
  reviewCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.quiet
  },
  reviewCardSoft: {
    borderRadius: radii.xl,
    backgroundColor: colors.mist,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.quiet
  },
  reviewKicker: {
    ...typography.label,
    color: colors.sage
  },
  reviewDetail: {
    ...typography.body,
    color: colors.ink
  },
  celebrationWrap: {
    alignSelf: "center",
    width: 132,
    height: 132,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl
  },
  celebrationDotOne: {
    position: "absolute",
    left: 12,
    top: 18,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.blush
  },
  celebrationDotTwo: {
    position: "absolute",
    right: 8,
    bottom: 20,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.lavender
  },
  completeMark: {
    width: 96,
    height: 96,
    borderRadius: 34,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft
  },
  starBadge: {
    position: "absolute",
    right: 18,
    top: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.quiet
  },
  completeTitle: {
    ...typography.title,
    color: colors.ink,
    textAlign: "center"
  },
  completeMessage: {
    ...typography.body,
    color: colors.subtle,
    textAlign: "center"
  },
  completionSummary: {
    borderRadius: radii.xl,
    backgroundColor: colors.mist,
    padding: spacing.lg,
    ...shadows.quiet
  },
  summaryText: {
    ...typography.body,
    color: colors.ink,
    textAlign: "center"
  },
  completeStats: {
    alignSelf: "center",
    minWidth: 140,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    alignItems: "center",
    padding: spacing.lg,
    ...shadows.quiet
  },
  completeNumber: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "800",
    letterSpacing: 0,
    color: colors.sage
  },
  completeLabel: {
    ...typography.bodySmall,
    color: colors.subtle
  }
});
