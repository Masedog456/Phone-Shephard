import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, Clock3, Sparkles } from "lucide-react-native";
import { CapturedContent } from "@/types/domain";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export function CaptureCard({ capture, onPress }: { capture: CapturedContent; onPress?: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.icon}>
        <Sparkles color={colors.sage} size={22} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.source}>{capture.sourceLabel}</Text>
        <Text style={styles.title}>{capture.title}</Text>
        <Text style={styles.preview}>{capture.preview}</Text>
        <View style={styles.metaRow}>
          <Clock3 color={colors.muted} size={14} />
          <Text style={styles.meta}>{formatCapturedAt(capture.capturedAt)}</Text>
          <Text style={styles.meta}>.</Text>
          <Text style={styles.meta}>{capture.suggestedShepherd}</Text>
        </View>
      </View>
      {onPress ? <ChevronRight color={colors.muted} size={18} /> : null}
    </Pressable>
  );
}

function formatCapturedAt(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours} hr ago`;
}

const styles = StyleSheet.create({
  card: {
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
  icon: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  source: {
    ...typography.label,
    color: colors.sage
  },
  title: {
    ...typography.cardTitle,
    color: colors.ink
  },
  preview: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  meta: {
    ...typography.bodySmall,
    color: colors.muted
  }
});
