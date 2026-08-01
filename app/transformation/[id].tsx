import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, Sparkles } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { TransformationResultView } from "@/components/TransformationResultView";
import { useTransformations } from "@/features/transformation/useTransformations";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function TransformationResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const result = useTransformations((state) => (id ? state.results[id] : undefined));
  const isLoading = useTransformations((state) => state.isLoading);
  const error = useTransformations((state) => state.error);
  const loadById = useTransformations((state) => state.loadById);
  const save = useTransformations((state) => state.save);
  const remind = useTransformations((state) => state.remind);
  const feedback = useTransformations((state) => state.feedback);

  useEffect(() => {
    if (!id || result) return;
    void loadById(id);
  }, [id, loadById, result]);

  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
      </View>

      {result ? (
        <TransformationResultView result={result} onSave={save} onReminder={remind} onFeedback={feedback} />
      ) : (
        <View style={styles.stateCard}>
          <View style={styles.stateIcon}>
            {isLoading ? <ActivityIndicator color={colors.sage} /> : <Sparkles color={colors.sage} size={24} />}
          </View>
          <Text style={styles.stateTitle}>{isLoading ? "Opening what Shepherd created..." : "This result is not in view yet."}</Text>
          <Text style={styles.stateText}>
            {error ?? "If this was created on another device, Shepherd will look for it in your private account."}
          </Text>
          {!isLoading && id ? (
            <Pressable style={styles.retryButton} onPress={() => void loadById(id)}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { marginBottom: spacing.lg },
  backButton: { width: 46, height: 46, borderRadius: 18, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", ...shadows.quiet },
  stateCard: { borderRadius: radii.xl, backgroundColor: colors.card, padding: spacing.xl, gap: spacing.md, alignItems: "flex-start", ...shadows.soft },
  stateIcon: { width: 54, height: 54, borderRadius: 20, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center" },
  stateTitle: { ...typography.subtitle, color: colors.ink },
  stateText: { ...typography.body, color: colors.subtle },
  retryButton: { minHeight: 48, borderRadius: radii.xl, backgroundColor: colors.ink, paddingHorizontal: spacing.lg, alignItems: "center", justifyContent: "center", marginTop: spacing.sm },
  retryText: { ...typography.button, color: colors.cream }
});
