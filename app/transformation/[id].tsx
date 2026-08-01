import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { TransformationResultView } from "@/components/TransformationResultView";
import { transformationResults } from "@/features/transformation/mockTransformations";
import { useTransformations } from "@/features/transformation/useTransformations";
import { colors, shadows, spacing } from "@/lib/theme";

export default function TransformationResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const result = useTransformations((state) => state.results[id]) ?? transformationResults.business;
  const save = useTransformations((state) => state.save);
  const remind = useTransformations((state) => state.remind);
  const feedback = useTransformations((state) => state.feedback);

  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
      </View>
      <TransformationResultView result={result} onSave={save} onReminder={remind} onFeedback={feedback} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { marginBottom: spacing.lg },
  backButton: { width: 46, height: 46, borderRadius: 18, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", ...shadows.quiet }
});

