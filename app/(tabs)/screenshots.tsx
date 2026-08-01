import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMediaScan } from "@/features/media/useMediaScan";
import { AssetCard } from "@/components/AssetCard";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { colors, radii, spacing, typography } from "@/lib/theme";

export default function ScreenshotsScreen() {
  const { screenshotAssets, requestAndScan, updateLocalStatus, analyzeAssets, isScanning, isAnalyzing } = useMediaScan();

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Screenshot Shepherd</Text>
          <Text style={styles.title}>Your screenshots are ready to tell their story.</Text>
        </View>
        <Pressable style={styles.scanButton} onPress={requestAndScan}>
          <Text style={styles.scanText}>{isScanning ? "Listening" : "Invite"}</Text>
        </Pressable>
      </View>

      {screenshotAssets.length > 0 && (
        <Pressable
          style={styles.analyzeButton}
          disabled={isAnalyzing}
          onPress={() => {
            analyzeAssets().catch((error) => Alert.alert("Shepherd could not read these yet", error.message));
          }}
        >
          <Text style={styles.analyzeText}>{isAnalyzing ? "Reading their story..." : "Let Shepherd read their story"}</Text>
        </Pressable>
      )}

      <FlatList
        data={screenshotAssets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={screenshotAssets.length ? styles.list : styles.emptyList}
        ListEmptyComponent={
          <EmptyState
            title="Your screenshots are ready to tell their story."
            body="When you gather them, Shepherd will look for saved things you may want to rediscover, keep safe, or gently release."
            examples={["Recipes", "Travel plans", "Ideas", "Quotes", "Purchases"]}
          />
        }
        renderItem={({ item }) => (
          <AssetCard
            asset={item}
            onArchive={() => updateLocalStatus(item.id, "archived")}
            onKeep={() => updateLocalStatus(item.id, "active")}
            onDelete={() => updateLocalStatus(item.id, "deleted_pending")}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  kicker: {
    ...typography.label,
    color: colors.sage
  },
  title: {
    ...typography.subtitle,
    color: colors.ink,
    marginTop: spacing.xs,
    maxWidth: 270
  },
  scanButton: {
    height: 46,
    minWidth: 92,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center"
  },
  scanText: {
    ...typography.button,
    color: colors.cream
  },
  analyzeButton: {
    minHeight: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md
  },
  analyzeText: {
    ...typography.button,
    color: colors.cream
  },
  list: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 120
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center"
  }
});
