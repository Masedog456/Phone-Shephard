import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, Vibration, View } from "react-native";
import { ArrowLeft, CalendarClock, CheckCircle2, Globe, PenLine, Sparkles, TriangleAlert, UserRound } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { useUrlIntake } from "@/features/sources/useUrlIntake";
import { fetchLibraryItem } from "@/lib/api";
import { useTransformations } from "@/features/transformation/useTransformations";
import { LibraryItem } from "@/types/domain";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

const DUPLICATE_COPY: Record<string, { title: string; body: string }> = {
  identical: {
    title: "You already saved this page",
    body: "The page has not changed since you last kept it, so Shepherd refreshed the one you already have instead of making a second copy."
  },
  content_changed: {
    title: "This page changed since you saved it",
    body: "Shepherd kept this as a new capture so the earlier version stays exactly as you first read it."
  },
  same_content_different_url: {
    title: "Same reading, different link",
    body: "Another saved thing has the same words under a different address. Both are kept."
  }
};

export default function SourceReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const result = useUrlIntake((state) => state.result);
  const attachNote = useUrlIntake((state) => state.attachNote);
  const createFromLibraryItem = useTransformations((state) => state.createFromLibraryItem);

  const [item, setItem] = useState<LibraryItem | null>(result && result.item.id === id ? result.item : null);
  const [isLoading, setIsLoading] = useState(!item);
  const [note, setNote] = useState(item?.userNote ?? "");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [isUnderstanding, setIsUnderstanding] = useState(false);

  useEffect(() => {
    if (item || !id) return;
    let cancelled = false;
    fetchLibraryItem(id)
      .then((loaded) => {
        if (cancelled) return;
        setItem(loaded);
        setNote(loaded?.userNote ?? "");
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, item]);

  async function handleSaveNote() {
    if (!item) return;
    setIsSavingNote(true);
    try {
      await attachNote(item.id, note.trim());
      setNoteSaved(true);
      Vibration.vibrate(6);
    } catch (error) {
      Alert.alert("Shepherd could not keep that note", error instanceof Error ? error.message : "Try again in a moment.");
    } finally {
      setIsSavingNote(false);
    }
  }

  async function handleUnderstand() {
    if (!item) return;
    setIsUnderstanding(true);
    try {
      const transformation = await createFromLibraryItem(item, "summarize");
      router.push(`/transformation/${transformation.id}`);
    } catch (error) {
      Alert.alert("Shepherd needs another moment", error instanceof Error ? error.message : "This could not be understood yet.");
    } finally {
      setIsUnderstanding(false);
    }
  }

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.sage} />
          <Text style={styles.stateText}>Opening what Shepherd kept...</Text>
        </View>
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.stateText}>This saved page is not here anymore.</Text>
        </View>
      </Screen>
    );
  }

  const failed = item.extractionStatus === "failed";
  const partial = item.extractionStatus === "partial";
  const duplicate = result && result.item.id === item.id ? DUPLICATE_COPY[result.duplicateStatus] : undefined;

  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
      </View>

      <View style={styles.header}>
        <Text style={styles.kicker}>{failed ? "Shepherd could not read this" : "Shepherd kept this"}</Text>
        <Text style={styles.title}>{item.title}</Text>
      </View>

      {duplicate ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>{duplicate.title}</Text>
          <Text style={styles.noticeBody}>{duplicate.body}</Text>
        </View>
      ) : null}

      {/* Provenance — metadata the SOURCE supplied, kept apart from anything derived. */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Where this came from</Text>
        <Meta icon={<Globe color={colors.sage} size={16} />} label="Site" value={item.source} />
        <Meta icon={<UserRound color={colors.sage} size={16} />} label="Author" value={item.creator ?? "Not stated by the page"} />
        <Meta
          icon={<CalendarClock color={colors.sage} size={16} />}
          label="Published"
          value={item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : "Not stated by the page"}
        />
        <Meta
          icon={<CalendarClock color={colors.sage} size={16} />}
          label="Read by Shepherd"
          value={item.fetchedAt ? new Date(item.fetchedAt).toLocaleString() : "—"}
        />
        <Text style={styles.url} numberOfLines={2}>
          {item.canonicalUrl ?? item.sourceUrl}
        </Text>
      </View>

      {failed ? (
        <View style={styles.errorCard}>
          <View style={styles.errorTop}>
            <TriangleAlert color={colors.warning} size={20} />
            <Text style={styles.errorTitle}>The page did not give up its words</Text>
          </View>
          <Text style={styles.errorBody}>
            The link and the moment you saved it are kept, but there is no readable text. Pages behind a login or a paywall usually
            land here.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>The page's own words</Text>
          {partial ? <Text style={styles.partialNote}>Only a little readable text came back, so this may be incomplete.</Text> : null}
          <Text style={styles.sourceText}>{item.extractedText?.slice(0, 4000) ?? "No text was recovered."}</Text>
          {(item.extractedText?.length ?? 0) > 4000 ? <Text style={styles.truncated}>Showing the beginning of what was kept.</Text> : null}
        </View>
      )}

      {/* The user's own words. Never written or overwritten by AI. */}
      <View style={styles.card}>
        <View style={styles.noteHeader}>
          <PenLine color={colors.sage} size={18} />
          <Text style={styles.sectionLabel}>Your note</Text>
        </View>
        <Text style={styles.noteHint}>What made this worth keeping? This stays yours — Shepherd never rewrites it.</Text>
        <TextInput
          value={note}
          onChangeText={(value) => {
            setNote(value);
            setNoteSaved(false);
          }}
          placeholder="A thought, a reason, something to come back to..."
          placeholderTextColor={colors.muted}
          multiline
          style={styles.noteInput}
          accessibilityLabel="Your note about this page"
        />
        <Pressable
          style={[styles.secondaryButton, isSavingNote && styles.buttonDisabled]}
          onPress={handleSaveNote}
          disabled={isSavingNote}
          accessibilityRole="button"
        >
          {noteSaved ? <CheckCircle2 color={colors.sage} size={18} /> : null}
          <Text style={styles.secondaryText}>{isSavingNote ? "Keeping..." : noteSaved ? "Note kept" : "Keep this note"}</Text>
        </Pressable>
      </View>

      {/* AI is opt-in and clearly separate. It never becomes the user's reflection. */}
      {!failed ? (
        <Pressable
          style={[styles.primaryButton, isUnderstanding && styles.buttonDisabled]}
          onPress={handleUnderstand}
          disabled={isUnderstanding}
          accessibilityRole="button"
        >
          {isUnderstanding ? <ActivityIndicator color={colors.cream} /> : <Sparkles color={colors.cream} size={20} />}
          <Text style={styles.primaryText}>{isUnderstanding ? "Reading it through..." : "Ask Shepherd to make sense of this"}</Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.ghostButton} onPress={() => router.replace("/library")} accessibilityRole="button">
        <Text style={styles.ghostText}>Done — it is in your Library</Text>
      </Pressable>
    </Screen>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      {icon}
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  stateText: { ...typography.body, color: colors.subtle, textAlign: "center" },
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
  header: { gap: spacing.sm, marginTop: spacing.lg },
  kicker: { ...typography.label, color: colors.sage },
  title: { ...typography.subtitle, color: colors.ink },
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.lg,
    ...shadows.quiet
  },
  noticeCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.mist,
    padding: spacing.lg,
    gap: spacing.xs,
    marginTop: spacing.lg
  },
  noticeTitle: { ...typography.cardTitle, color: colors.ink },
  noticeBody: { ...typography.bodySmall, color: colors.subtle },
  sectionLabel: { ...typography.label, color: colors.sage },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  metaLabel: { ...typography.bodySmall, color: colors.muted, width: 108 },
  metaValue: { ...typography.bodySmall, color: colors.ink, flex: 1 },
  url: { ...typography.bodySmall, color: colors.blue, marginTop: spacing.xs },
  sourceText: { ...typography.body, color: colors.ink },
  partialNote: { ...typography.bodySmall, color: colors.clay },
  truncated: { ...typography.bodySmall, color: colors.muted },
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
  noteHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  noteHint: { ...typography.bodySmall, color: colors.subtle },
  noteInput: {
    minHeight: 104,
    borderRadius: radii.lg,
    backgroundColor: colors.cardSoft,
    padding: spacing.md,
    textAlignVertical: "top",
    ...typography.body,
    color: colors.ink
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
    marginTop: spacing.lg,
    ...shadows.soft
  },
  primaryText: { ...typography.button, color: colors.cream },
  secondaryButton: {
    minHeight: 46,
    borderRadius: radii.xl,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignSelf: "flex-start"
  },
  secondaryText: { ...typography.button, color: colors.ink },
  buttonDisabled: { opacity: 0.6 },
  ghostButton: { minHeight: 52, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  ghostText: { ...typography.button, color: colors.sage }
});
