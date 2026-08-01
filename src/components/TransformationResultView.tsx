import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Share, StyleSheet, Text, Vibration, View } from "react-native";
import { Bell, Bookmark, Check, CheckCircle2, Share2, Sparkles, ThumbsDown, ThumbsUp, Tags } from "lucide-react-native";
import { TransformationResult } from "@/types/domain";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

type Feedback = "useful" | "not_useful" | "wrong_category";
type SavedAction = "library" | "reminder" | null;

export function TransformationResultView({
  result,
  onSave,
  onReminder,
  onFeedback
}: {
  result: TransformationResult;
  onSave?: (id: string) => void | Promise<void>;
  onReminder?: (id: string, message: string) => void | Promise<void>;
  onFeedback?: (id: string, rating: Feedback) => void | Promise<void>;
}) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [savedAction, setSavedAction] = useState<SavedAction>(null);
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(reveal, { toValue: 1, friction: 8, tension: 45, useNativeDriver: true }).start();
  }, [reveal]);

  function chooseFeedback(value: Feedback) {
    setFeedback(value);
    Vibration.vibrate(6);
    void onFeedback?.(result.id, value);
  }

  function saveToLibrary() {
    setSavedAction("library");
    Vibration.vibrate(8);
    void onSave?.(result.id);
  }

  function addReminder() {
    setSavedAction("reminder");
    Vibration.vibrate(8);
    void onReminder?.(result.id, result.nextAction);
  }

  async function shareResult() {
    await Share.share({
      title: result.outputTitle,
      message: `${result.outputTitle}\n\n${result.outputDescription}\n\nCreated with Phone Shepherd.`
    });
  }

  return (
    <Animated.View style={[styles.container, { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
      <View style={styles.hero}>
        <View style={styles.heroMark}>
          <Sparkles color={colors.cream} size={28} />
        </View>
        <Text style={styles.eyebrow}>{result.eyebrow}</Text>
        <Text style={styles.title}>{result.title}</Text>
        <Text style={styles.summary}>{result.summary}</Text>
      </View>

      <View style={styles.sourceSection}>
        <Text style={styles.sectionLabel}>What I brought together</Text>
        <View style={styles.sources}>
          {result.sources.map((source) => (
            <View key={source.label} style={styles.sourcePill}>
              <Text style={styles.sourceCount}>{source.count}</Text>
              <Text style={styles.sourceLabel}>{source.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.outputCard}>
        <View style={styles.outputTop}>
          <View style={styles.outputIcon}><CheckCircle2 color={colors.sage} size={24} /></View>
          <View style={styles.outputHeading}>
            <Text style={styles.outputLabel}>{result.outputLabel}</Text>
            <Text style={styles.outputTitle}>{result.outputTitle}</Text>
          </View>
        </View>
        <Text style={styles.outputDescription}>{result.outputDescription}</Text>

        <View style={styles.sections}>
          {result.sections.map((section, index) => (
            <View key={section.title} style={[styles.outputSection, index === result.sections.length - 1 && styles.outputSectionLast]}>
              <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>{index + 1}</Text></View>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionDetail}>{section.detail}</Text>
                {section.meta ? <Text style={styles.sectionMeta}>{section.meta}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.nextCard}>
        <Text style={styles.nextKicker}>A gentle next step</Text>
        <Text style={styles.nextTitle}>{result.nextAction}</Text>
        <Text style={styles.nextDetail}>{result.nextActionDetail}</Text>
      </View>

      {savedAction ? (
        <View style={styles.confirmation}>
          <Check color={colors.sage} size={20} />
          <Text style={styles.confirmationText}>
            {savedAction === "library" ? `Saved to ${result.libraryDestination}` : "I will bring this back when it is useful."}
          </Text>
        </View>
      ) : null}

      <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={saveToLibrary}>
        <Bookmark color={colors.cream} size={20} />
        <Text style={styles.primaryText}>Save to Library</Text>
      </Pressable>
      <View style={styles.actionRow}>
        <Pressable style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]} onPress={addReminder}>
          <Bell color={colors.ink} size={19} />
          <Text style={styles.actionText}>Remind me</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]} onPress={shareResult}>
          <Share2 color={colors.ink} size={19} />
          <Text style={styles.actionText}>Share</Text>
        </Pressable>
      </View>

      <View style={styles.feedbackCard}>
        <Text style={styles.feedbackKicker}>Teach Shepherd</Text>
        <Text style={styles.feedbackQuestion}>Did I understand what mattered?</Text>
        <View style={styles.feedbackRow}>
          <FeedbackButton icon={<ThumbsUp color={feedback === "useful" ? colors.cream : colors.ink} size={17} />} label="Useful" active={feedback === "useful"} onPress={() => chooseFeedback("useful")} />
          <FeedbackButton icon={<ThumbsDown color={feedback === "not_useful" ? colors.cream : colors.ink} size={17} />} label="Not useful" active={feedback === "not_useful"} onPress={() => chooseFeedback("not_useful")} />
          <FeedbackButton icon={<Tags color={feedback === "wrong_category" ? colors.cream : colors.ink} size={17} />} label="Wrong category" active={feedback === "wrong_category"} onPress={() => chooseFeedback("wrong_category")} />
        </View>
        {feedback ? <Text style={styles.feedbackThanks}>Thank you. I will carry that forward.</Text> : null}
      </View>
    </Animated.View>
  );
}

function FeedbackButton({ icon, label, active, onPress }: { icon: React.ReactNode; label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.feedbackButton, active && styles.feedbackButtonActive]} onPress={onPress}>
      {icon}<Text style={[styles.feedbackText, active && styles.feedbackTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  hero: { borderRadius: radii.xl, backgroundColor: colors.ink, padding: spacing.xl, gap: spacing.md, ...shadows.soft },
  heroMark: { width: 58, height: 58, borderRadius: 22, backgroundColor: colors.sage, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  eyebrow: { ...typography.label, color: colors.mist },
  title: { ...typography.title, color: colors.cream },
  summary: { ...typography.body, color: colors.cream },
  sourceSection: { gap: spacing.md },
  sectionLabel: { ...typography.label, color: colors.sage },
  sources: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sourcePill: { minWidth: 100, flexGrow: 1, borderRadius: radii.lg, backgroundColor: colors.card, padding: spacing.md, ...shadows.quiet },
  sourceCount: { ...typography.subtitle, color: colors.ink },
  sourceLabel: { ...typography.bodySmall, color: colors.subtle },
  outputCard: { borderRadius: radii.xl, backgroundColor: colors.card, padding: spacing.lg, gap: spacing.lg, ...shadows.soft },
  outputTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  outputIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center" },
  outputHeading: { flex: 1, gap: spacing.xs },
  outputLabel: { ...typography.label, color: colors.sage },
  outputTitle: { ...typography.subtitle, color: colors.ink },
  outputDescription: { ...typography.body, color: colors.subtle },
  sections: { borderRadius: radii.xl, backgroundColor: colors.cardSoft, paddingHorizontal: spacing.lg },
  outputSection: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  outputSectionLast: { borderBottomWidth: 0 },
  sectionNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center" },
  sectionNumberText: { ...typography.label, color: colors.sage },
  sectionCopy: { flex: 1, gap: spacing.xs },
  sectionTitle: { ...typography.cardTitle, color: colors.ink },
  sectionDetail: { ...typography.bodySmall, color: colors.subtle },
  sectionMeta: { ...typography.label, color: colors.blue, marginTop: spacing.xs },
  nextCard: { borderRadius: radii.xl, backgroundColor: colors.mist, padding: spacing.xl, gap: spacing.sm, ...shadows.quiet },
  nextKicker: { ...typography.label, color: colors.sage },
  nextTitle: { ...typography.subtitle, color: colors.ink },
  nextDetail: { ...typography.body, color: colors.subtle },
  confirmation: { borderRadius: radii.lg, backgroundColor: colors.card, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  confirmationText: { ...typography.bodySmall, color: colors.ink, flex: 1 },
  primaryButton: { minHeight: 58, borderRadius: radii.xl, backgroundColor: colors.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, ...shadows.soft },
  primaryText: { ...typography.button, color: colors.cream },
  actionRow: { flexDirection: "row", gap: spacing.md },
  actionButton: { flex: 1, minHeight: 54, borderRadius: radii.xl, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, ...shadows.quiet },
  actionText: { ...typography.button, color: colors.ink },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  feedbackCard: { borderRadius: radii.xl, backgroundColor: colors.cardSoft, padding: spacing.lg, gap: spacing.md },
  feedbackKicker: { ...typography.label, color: colors.sage },
  feedbackQuestion: { ...typography.cardTitle, color: colors.ink },
  feedbackRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  feedbackButton: { minHeight: 42, borderRadius: radii.pill, backgroundColor: colors.card, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  feedbackButtonActive: { backgroundColor: colors.sage },
  feedbackText: { ...typography.bodySmall, color: colors.ink },
  feedbackTextActive: { color: colors.cream },
  feedbackThanks: { ...typography.bodySmall, color: colors.sage }
});



