import { Pressable, StyleSheet, Text } from "react-native";
import { CaptureAction } from "@/types/domain";
import { captureActionLabels } from "@/features/capture/mockCaptures";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export function CaptureActionChip({
  action,
  selected,
  onPress
}: {
  action: CaptureAction;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]} onPress={onPress}>
      <Text style={[styles.text, selected && styles.selectedText]}>{captureActionLabels[action]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.quiet
  },
  selected: {
    backgroundColor: colors.ink
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  },
  text: {
    ...typography.bodySmall,
    color: colors.ink
  },
  selectedText: {
    color: colors.cream
  }
});
