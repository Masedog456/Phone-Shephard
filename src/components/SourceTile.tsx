import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export function SourceTile({
  icon,
  title,
  body,
  badge,
  onPress
}: {
  icon: ReactNode;
  title: string;
  body: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <View style={styles.icon}>{icon}</View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {badge && <Text style={styles.badge}>{badge}</Text>}
        </View>
        <Text style={styles.body}>{body}</Text>
      </View>
      <ChevronRight color={colors.muted} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 96,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadows.quiet
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  title: {
    ...typography.cardTitle,
    color: colors.ink
  },
  badge: {
    ...typography.bodySmall,
    color: colors.blue,
    backgroundColor: colors.cardSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  body: {
    ...typography.bodySmall,
    color: colors.subtle
  }
});
