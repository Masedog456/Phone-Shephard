import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, TextInput, Vibration, View } from "react-native";
import { useState } from "react";
import {
  ArrowLeft,
  AtSign,
  Compass,
  FileText,
  Files,
  Images,
  Instagram,
  Mic,
  Music2,
  Pin,
  PlaySquare,
  Sparkles,
  Video
} from "lucide-react-native";
import { CaptureCard } from "@/components/CaptureCard";
import { Screen } from "@/components/Screen";
import { captureSourcePrompts } from "@/features/capture/mockCaptures";
import { useCaptureInbox } from "@/features/capture/useCaptureInbox";
import { CapturePlatform } from "@/types/domain";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function CaptureScreen() {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const captures = useCaptureInbox((state) => state.captures);
  const captureFromSource = useCaptureInbox((state) => state.captureFromSource);
  const captureManually = useCaptureInbox((state) => state.captureManually);

  function beginMockCapture(source: CapturePlatform) {
    const capture = captureFromSource(source);
    Vibration.vibrate(8);
    router.push(`/capture/${capture.id}`);
  }

  function beginManualCapture() {
    if (!title.trim() || !note.trim()) {
      Alert.alert("Give Shepherd a little context", "Add a title and what made this worth saving.");
      return;
    }

    const capture = captureManually({ title, link, note });
    setTitle("");
    setLink("");
    setNote("");
    Vibration.vibrate(8);
    router.push(`/capture/${capture.id}`);
  }

  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
      </View>

      <View style={styles.header}>
        <View style={styles.heroIcon}>
          <Sparkles color={colors.sage} size={30} />
        </View>
        <Text style={styles.kicker}>Universal Capture</Text>
        <Text style={styles.title}>Found something valuable?</Text>
        <Text style={styles.subtitle}>
          Share it to Phone Shepherd, and I will understand what it is, why it may matter, and where it belongs.
        </Text>
      </View>

      <View style={styles.nativeShareCard}>
        <Text style={styles.nativeTitle}>Native sharing preview</Text>
        <Text style={styles.nativeBody}>
          Future iOS and Android share extensions will open this same review flow from Safari, Instagram, TikTok, YouTube, files, photos, voice notes, and documents.
        </Text>
      </View>

      <View style={styles.manualCard}>
        <Text style={styles.manualKicker}>Capture now</Text>
        <Text style={styles.manualTitle}>Paste something worth remembering.</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title, recipe, idea, quote, plan..."
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          placeholder="Optional link"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Why did this feel worth saving?"
          placeholderTextColor={colors.muted}
          multiline
          style={[styles.input, styles.noteInput]}
        />
        <Pressable style={styles.primaryButton} onPress={beginManualCapture}>
          <Text style={styles.primaryText}>Let Shepherd understand it</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Preview future sources</Text>
      <View style={styles.sourceGrid}>
        {captureSourcePrompts.map((prompt) => (
          <Pressable key={prompt.source} style={({ pressed }) => [styles.sourceCard, pressed && styles.pressed]} onPress={() => beginMockCapture(prompt.source)}>
            <View style={styles.sourceIcon}>{iconForSource(prompt.source)}</View>
            <View style={styles.sourceCopy}>
              <Text style={styles.sourceTitle}>{prompt.title}</Text>
              <Text style={styles.sourceBody}>{prompt.body}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recently captured</Text>
      <View style={styles.list}>
        {captures.slice(0, 3).map((capture) => (
          <CaptureCard key={capture.id} capture={capture} onPress={() => router.push(`/capture/${capture.id}`)} />
        ))}
      </View>
    </Screen>
  );
}

function iconForSource(source: CapturePlatform) {
  const props = { color: colors.ink, size: 21 };
  switch (source) {
    case "safari":
      return <Compass {...props} />;
    case "instagram":
      return <Instagram {...props} />;
    case "tiktok":
      return <Music2 {...props} />;
    case "youtube":
      return <PlaySquare {...props} />;
    case "pinterest":
      return <Pin {...props} />;
    case "reddit":
    case "x":
      return <AtSign {...props} />;
    case "files":
      return <Files {...props} />;
    case "photos":
      return <Images {...props} />;
    case "videos":
      return <Video {...props} />;
    case "voice_notes":
      return <Mic {...props} />;
    default:
      return <FileText {...props} />;
  }
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
    width: 68,
    height: 68,
    borderRadius: 26,
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
  nativeShareCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
    padding: spacing.xl,
    gap: spacing.sm,
    marginTop: spacing.xl,
    ...shadows.soft
  },
  nativeTitle: {
    ...typography.cardTitle,
    color: colors.cream
  },
  nativeBody: {
    ...typography.bodySmall,
    color: colors.cream
  },
  manualCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.xl,
    ...shadows.soft
  },
  manualKicker: {
    ...typography.label,
    color: colors.sage
  },
  manualTitle: {
    ...typography.cardTitle,
    color: colors.ink
  },
  input: {
    minHeight: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.cardSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.ink
  },
  noteInput: {
    minHeight: 104,
    textAlignVertical: "top"
  },
  primaryButton: {
    minHeight: 54,
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
  sectionTitle: {
    ...typography.cardTitle,
    color: colors.ink,
    marginTop: spacing.xl
  },
  sourceGrid: {
    gap: spacing.md,
    marginTop: spacing.md
  },
  sourceCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    ...shadows.quiet
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  sourceIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
  },
  sourceCopy: {
    flex: 1,
    gap: spacing.xs
  },
  sourceTitle: {
    ...typography.cardTitle,
    color: colors.ink
  },
  sourceBody: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  list: {
    gap: spacing.md,
    marginTop: spacing.md
  }
});
