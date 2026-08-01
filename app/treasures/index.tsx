import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, Sparkles } from "lucide-react-native";
import { ForgottenTreasureCard } from "@/components/ForgottenTreasureCard";
import { Screen } from "@/components/Screen";
import { forgottenTreasures } from "@/features/insights/digitalLifeInsights";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function TreasuresScreen() {
  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
      </View>

      <View style={styles.header}>
        <View style={styles.heroIcon}>
          <Sparkles color={colors.sage} size={28} />
        </View>
        <Text style={styles.kicker}>Forgotten Treasures</Text>
        <Text style={styles.title}>Useful, meaningful things you already saved.</Text>
        <Text style={styles.subtitle}>
          Shepherd looks for memories, ideas, receipts, recipes, and quotes that deserve to be found again.
        </Text>
      </View>

      <View style={styles.list}>
        {forgottenTreasures.map((treasure) => (
          <ForgottenTreasureCard key={treasure.id} treasure={treasure} />
        ))}
      </View>

      <View style={styles.note}>
        <Text style={styles.noteTitle}>Nothing is moved without you.</Text>
        <Text style={styles.noteText}>
          Future integrations will connect Notes, browser tabs, saved social posts, and documents. For now, this preview shows the review experience before access is granted.
        </Text>
      </View>
    </Screen>
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
    width: 62,
    height: 62,
    borderRadius: 24,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
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
  list: {
    gap: spacing.lg,
    marginTop: spacing.xl
  },
  note: {
    borderRadius: radii.xl,
    backgroundColor: colors.mist,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.xl,
    ...shadows.quiet
  },
  noteTitle: {
    ...typography.cardTitle,
    color: colors.ink
  },
  noteText: {
    ...typography.bodySmall,
    color: colors.subtle
  }
});
