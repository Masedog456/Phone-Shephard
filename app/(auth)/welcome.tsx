import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { HeartPulse, ShieldCheck, Sparkles } from "lucide-react-native";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function WelcomeScreen() {
  return (
    <View style={styles.background}>
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <ShieldCheck color={colors.sage} size={26} />
          <Text style={styles.brand}>Phone Shepherd</Text>
        </View>

        <View style={styles.wellnessCard}>
          <View style={styles.wellnessIcon}>
            <HeartPulse color={colors.sage} size={42} />
          </View>
          <View style={styles.wellnessCopy}>
            <Text style={styles.wellnessLabel}>Digital Wellness</Text>
          <Text style={styles.wellnessText}>A quiet guide for the memories and ideas you saved.</Text>
          </View>
          <View style={styles.sparkBadge}>
            <Sparkles color={colors.blue} size={20} />
          </View>
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.title}>Meet your digital caretaker.</Text>
          <Text style={styles.subtitle}>
            Phone Shepherd helps you rediscover what matters, preserve what feels meaningful, and gently release what no longer needs your attention.
          </Text>
        </View>

        <View style={styles.trustList}>
          <TrustItem text="You decide what Shepherd looks at." />
          <TrustItem text="Nothing changes without your approval." />
          <TrustItem text="Sensitive things are treated quietly and carefully." />
        </View>

        <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={() => router.push("/sign-in")}>
          <Text style={styles.buttonText}>Begin your first reset</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TrustItem({ text }: { text: string }) {
  return (
    <View style={styles.trustItem}>
      <View style={styles.trustDot} />
      <Text style={styles.trustText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.cream
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    padding: spacing.xl,
    paddingTop: 72
  },
  brandRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center"
  },
  brand: {
    ...typography.label,
    color: colors.ink
  },
  wellnessCard: {
    minHeight: 148,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadows.soft
  },
  wellnessIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
  },
  wellnessCopy: {
    flex: 1,
    gap: spacing.xs
  },
  wellnessLabel: {
    ...typography.label,
    color: colors.sage
  },
  wellnessText: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  sparkBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  copyBlock: {
    gap: spacing.md
  },
  title: {
    ...typography.hero,
    color: colors.ink
  },
  subtitle: {
    ...typography.body,
    color: colors.subtle,
    maxWidth: 340
  },
  trustList: {
    gap: spacing.md
  },
  trustItem: {
    minHeight: 42,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    ...shadows.quiet
  },
  trustDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.sage
  },
  trustText: {
    ...typography.bodySmall,
    color: colors.ink,
    flex: 1
  },
  button: {
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  buttonText: {
    ...typography.button,
    color: colors.cream
  }
});
