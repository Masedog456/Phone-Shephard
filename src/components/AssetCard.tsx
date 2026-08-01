import { router } from "expo-router";
import type React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Archive, Heart, Trash2, TriangleAlert } from "lucide-react-native";
import { ShepherdAsset } from "@/types/domain";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export function AssetCard({
  asset,
  onArchive,
  onKeep,
  onDelete,
  compact = false
}: {
  asset: ShepherdAsset;
  onArchive?: () => void;
  onKeep?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={() => router.push(`/asset/${asset.id}`)}>
      <Image source={{ uri: asset.uri }} style={[styles.thumb, compact && styles.compactThumb]} contentFit="cover" />
      <View style={styles.copy}>
        <View style={styles.topLine}>
          <Text style={styles.category}>{asset.category || "Unsorted"}</Text>
          {asset.isSensitive && <TriangleAlert color={colors.warning} size={16} />}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {asset.summary || asset.filename || "Screenshot"}
        </Text>
        <Text style={styles.reason} numberOfLines={2}>
          {asset.reason || "Shepherd can help understand why this was saved before you decide what happens next."}
        </Text>
        {!compact && (
          <View style={styles.actions}>
            <IconButton label="Keep close" icon={<Heart color={colors.ink} size={17} />} onPress={onKeep} />
            <IconButton label="Keep safe" icon={<Archive color={colors.ink} size={17} />} onPress={onArchive} />
            <IconButton label="Let go" icon={<Trash2 color={colors.warning} size={17} />} onPress={onDelete} warning />
          </View>
        )}
      </View>
    </Pressable>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  warning = false
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  warning?: boolean;
}) {
  return (
    <Pressable
      style={[styles.iconButton, warning && styles.warningButton]}
      onPress={(event) => {
        event.stopPropagation();
        onPress?.();
      }}
    >
      {icon}
      <Text style={[styles.iconText, warning && styles.warningText]}>{label}</Text>
    </Pressable>
  );
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
    opacity: 0.88,
    transform: [{ scale: 0.99 }]
  },
  thumb: {
    width: 92,
    height: 124,
    borderRadius: radii.lg,
    backgroundColor: colors.mist
  },
  compactThumb: {
    height: 92
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  category: {
    ...typography.label,
    color: colors.sage,
    textTransform: "capitalize"
  },
  title: {
    ...typography.cardTitle,
    color: colors.ink
  },
  reason: {
    ...typography.bodySmall,
    color: colors.subtle
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  iconButton: {
    minHeight: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.cardSoft,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  warningButton: {
    backgroundColor: colors.warningSoft
  },
  iconText: {
    ...typography.bodySmall,
    color: colors.ink
  },
  warningText: {
    color: colors.warning
  }
});
