import { Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Screen } from "@/components/Screen";
import { useMediaScan } from "@/features/media/useMediaScan";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { screenshotAssets } = useMediaScan();
  const asset = screenshotAssets.find((item) => item.id === id);

  if (!asset) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Saved thing" }} />
        <Text style={styles.title}>This saved thing is not here anymore.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: "Saved thing" }} />
      <Image source={{ uri: asset.uri }} style={styles.image} contentFit="cover" />
      <View style={styles.meta}>
        <Text style={styles.kicker}>{asset.category}</Text>
        <Text style={styles.title}>{asset.summary || "Screenshot"}</Text>
        <Text style={styles.body}>{asset.reason || "Shepherd has not read this saved thing yet. Invite it when you are ready."}</Text>
        {asset.isSensitive && <Text style={styles.sensitive}>Sensitive saved thing. Move slowly before saving, sharing, or letting it go.</Text>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    aspectRatio: 0.72,
    borderRadius: radii.lg,
    backgroundColor: colors.mist,
    ...shadows.soft
  },
  meta: {
    gap: spacing.md,
    marginTop: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    padding: spacing.lg,
    ...shadows.quiet
  },
  kicker: {
    ...typography.label,
    color: colors.sage,
    textTransform: "capitalize"
  },
  title: {
    ...typography.subtitle,
    color: colors.ink
  },
  body: {
    ...typography.body,
    color: colors.subtle
  },
  sensitive: {
    ...typography.bodySmall,
    color: colors.warning,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    padding: spacing.md
  }
});
