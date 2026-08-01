import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Mail, Chrome, Apple, ShieldCheck } from "lucide-react-native";
import { useSession } from "@/features/auth/SessionProvider";
import { Screen } from "@/components/Screen";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function SignInScreen() {
  const { session, signInWithEmail, signInWithOAuth, startDemo } = useSession();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canPreviewDemo = isDemoMode && !isSupabaseConfigured;

  useEffect(() => {
    if (session) {
      router.replace("/(tabs)");
    }
  }, [session]);

  async function handleEmail() {
    if (!email.includes("@")) {
      Alert.alert("Add your email", "Enter a valid email address to receive a sign-in link.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await signInWithEmail(email.trim());
    setIsSubmitting(false);

    if (error) {
      Alert.alert("Sign-in failed", error.message);
      return;
    }

    Alert.alert("Check your inbox", "We sent you a magic link for Phone Shepherd.");
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Private by default</Text>
        <Text style={styles.title}>Start with a private moment of care.</Text>
        <Text style={styles.subtitle}>
          Sign in so Shepherd can remember what you cared for, what you protected, and what you want to find again.
        </Text>
      </View>

      <View style={styles.trustCard}>
        <ShieldCheck color={colors.sage} size={22} />
        <Text style={styles.trustText}>Nothing is changed, moved, or deleted unless you approve it.</Text>
      </View>

      <View style={styles.oauthStack}>
        {canPreviewDemo ? (
          <Pressable
            style={styles.demoButton}
            onPress={() => {
              startDemo();
            }}
          >
            <Text style={styles.demoText}>Preview the ritual</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.oauthButton} onPress={() => signInWithOAuth("apple")}>
          <Apple color={colors.ink} size={20} />
          <Text style={styles.oauthText}>Continue with Apple</Text>
        </Pressable>
        <Pressable style={styles.oauthButton} onPress={() => signInWithOAuth("google")}>
          <Chrome color={colors.ink} size={20} />
          <Text style={styles.oauthText}>Continue with Google</Text>
        </Pressable>
      </View>

      <View style={styles.emailBlock}>
        <View style={styles.inputWrap}>
          <Mail color={colors.muted} size={18} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>
        <Pressable style={styles.primaryButton} disabled={isSubmitting} onPress={handleEmail}>
          <Text style={styles.primaryText}>{isSubmitting ? "Preparing your link..." : "Send private sign-in link"}</Text>
        </Pressable>
      </View>

      <Text style={styles.footnote}>
        Phone Shepherd keeps analysis in your private account, and you can ask it to forget anytime.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    marginTop: spacing.xl
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
  oauthStack: {
    gap: spacing.md,
    marginTop: spacing.xxl
  },
  trustCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.mist,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
    ...shadows.quiet
  },
  trustText: {
    ...typography.bodySmall,
    color: colors.ink,
    flex: 1
  },
  demoButton: {
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft
  },
  demoText: {
    ...typography.button,
    color: colors.cream
  },
  oauthButton: {
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    ...shadows.quiet
  },
  oauthText: {
    ...typography.button,
    color: colors.ink
  },
  emailBlock: {
    marginTop: spacing.xl,
    gap: spacing.md
  },
  inputWrap: {
    height: 54,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    ...shadows.quiet
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.ink
  },
  primaryButton: {
    height: 54,
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft
  },
  primaryText: {
    ...typography.button,
    color: colors.cream
  },
  footnote: {
    ...typography.bodySmall,
    color: colors.muted,
    marginTop: "auto"
  }
});
