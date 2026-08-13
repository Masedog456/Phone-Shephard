import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, Vibration, View } from "react-native";
import { ArrowLeft, Globe, Link as LinkIcon, TriangleAlert } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { useUrlIntake } from "@/features/sources/useUrlIntake";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function SaveLinkScreen() {
  const [url, setUrl] = useState("");
  const phase = useUrlIntake((state) => state.phase);
  const failure = useUrlIntake((state) => state.failure);
  const submit = useUrlIntake((state) => state.submit);

  const isFetching = phase === "fetching";

  async function handleSubmit() {
    const trimmed = url.trim();
    if (!trimmed) return;
    const result = await submit(trimmed);
    if (result) {
      Vibration.vibrate(8);
      router.replace(`/source/${result.item.id}`);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
      </View>

      <View style={styles.header}>
        <View style={styles.heroIcon}>
          <Globe color={colors.sage} size={30} />
        </View>
        <Text style={styles.kicker}>Save a link</Text>
        <Text style={styles.title}>Paste a web page worth keeping.</Text>
        <Text style={styles.subtitle}>
          Shepherd opens the page, keeps its words and where they came from, and leaves the reading to you.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.inputRow}>
          <LinkIcon color={colors.muted} size={20} />
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://..."
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            editable={!isFetching}
            onSubmitEditing={handleSubmit}
            style={styles.input}
            accessibilityLabel="Web address"
          />
        </View>

        <Pressable
          style={[styles.primaryButton, (isFetching || !url.trim()) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isFetching || !url.trim()}
          accessibilityRole="button"
          accessibilityState={{ disabled: isFetching || !url.trim(), busy: isFetching }}
        >
          {isFetching ? <ActivityIndicator color={colors.cream} /> : null}
          <Text style={styles.primaryText}>{isFetching ? "Reading the page..." : "Save this link"}</Text>
        </Pressable>

        {isFetching ? <Text style={styles.progressNote}>Opening the page, then keeping its words and its source.</Text> : null}
      </View>

      {failure ? (
        <View style={styles.errorCard}>
          <View style={styles.errorTop}>
            <TriangleAlert color={colors.warning} size={20} />
            <Text style={styles.errorTitle}>Shepherd could not read that page</Text>
          </View>
          <Text style={styles.errorBody}>{failure.message}</Text>
          {failure.itemId ? (
            <Pressable style={styles.secondaryButton} onPress={() => router.replace(`/source/${failure.itemId}`)}>
              <Text style={styles.secondaryText}>See what was kept</Text>
            </Pressable>
          ) : null}
          {failure.retryable ? <Text style={styles.errorNote}>This one may work if you try again later.</Text> : null}
        </View>
      ) : null}

      <View style={styles.trustCard}>
        <Text style={styles.trustTitle}>What Shepherd keeps</Text>
        <Text style={styles.trustBody}>
          The page's own words, its title and author where the page says them, the address it came from, and the moment it was read.
          Anything Shepherd writes is labelled separately from what the page said.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { marginTop: spacing.sm },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.quiet
  },
  header: { gap: spacing.md, marginTop: spacing.xl },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 26,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
  },
  kicker: { ...typography.label, color: colors.sage },
  title: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.body, color: colors.subtle },
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.xl,
    ...shadows.soft
  },
  inputRow: {
    minHeight: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.cardSoft,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  input: { ...typography.body, color: colors.ink, flex: 1, paddingVertical: spacing.md },
  primaryButton: {
    minHeight: 54,
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    ...shadows.soft
  },
  buttonDisabled: { opacity: 0.5 },
  primaryText: { ...typography.button, color: colors.cream },
  progressNote: { ...typography.bodySmall, color: colors.subtle, textAlign: "center" },
  errorCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.warningSoft,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.lg,
    ...shadows.quiet
  },
  errorTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  errorTitle: { ...typography.cardTitle, color: colors.warning, flex: 1 },
  errorBody: { ...typography.body, color: colors.ink },
  errorNote: { ...typography.bodySmall, color: colors.subtle },
  secondaryButton: {
    minHeight: 46,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    alignSelf: "flex-start"
  },
  secondaryText: { ...typography.button, color: colors.ink },
  trustCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.cardSoft,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.lg,
    ...shadows.quiet
  },
  trustTitle: { ...typography.label, color: colors.sage },
  trustBody: { ...typography.bodySmall, color: colors.subtle }
});
