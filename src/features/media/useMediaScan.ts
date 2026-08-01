import { useMemo, useState } from "react";
import { Alert } from "react-native";
import { create } from "zustand";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { analyzeAssets as analyzeRemoteAssets, applyAction } from "@/lib/api";
import { scanRecentScreenshots } from "@/lib/mediaLibrary";
import { demoScreenshotAssets } from "@/features/media/demoAssets";
import { ShepherdAsset, ShepherdStatus } from "@/types/domain";

type MediaScanStore = {
  screenshotAssets: ShepherdAsset[];
  isScanning: boolean;
  isAnalyzing: boolean;
  setScreenshotAssets: (assets: ShepherdAsset[]) => void;
  setIsScanning: (value: boolean) => void;
  setIsAnalyzing: (value: boolean) => void;
  updateLocalStatus: (id: string, status: ShepherdStatus) => void;
  mergeAnalyzedAssets: (assets: ShepherdAsset[]) => void;
};

const useMediaScanStore = create<MediaScanStore>((set) => ({
  screenshotAssets: [],
  isScanning: false,
  isAnalyzing: false,
  setScreenshotAssets: (assets) => set({ screenshotAssets: assets }),
  setIsScanning: (value) => set({ isScanning: value }),
  setIsAnalyzing: (value) => set({ isAnalyzing: value }),
  updateLocalStatus: (id, status) =>
    set((state) => ({
      screenshotAssets: state.screenshotAssets.map((asset) => (asset.id === id ? { ...asset, status } : asset))
    })),
  mergeAnalyzedAssets: (assets) =>
    set((state) => ({
      screenshotAssets: state.screenshotAssets.map((asset) => assets.find((candidate) => candidate.id === asset.id) ?? asset)
    }))
}));

export function useMediaScan() {
  const store = useMediaScanStore();
  const [lastError, setLastError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = store.screenshotAssets.filter((asset) => asset.status !== "archived" && asset.status !== "deleted_pending");
    const deleteCandidates = store.screenshotAssets.filter((asset) => asset.suggestedAction === "delete" || asset.status === "deleted_pending");
    const savingsBytes = deleteCandidates.reduce((total, asset) => total + (asset.fileSize ?? 1_600_000), 0);
    return {
      photos: store.screenshotAssets.length,
      screenshots: store.screenshotAssets.length,
      toReview: active.length,
      cleaned: store.screenshotAssets.filter((asset) => asset.status === "archived" || asset.status === "deleted_pending").length,
      duplicates: estimateDuplicates(store.screenshotAssets),
      blurry: 0,
      accidental: 0,
      estimatedSavings: formatBytes(savingsBytes)
    };
  }, [store.screenshotAssets]);

  async function requestAndScan() {
    store.setIsScanning(true);
    setLastError(null);
    try {
      if (isDemoMode && !isSupabaseConfigured) {
        store.setScreenshotAssets(demoScreenshotAssets);
        return;
      }

      const assets = await scanRecentScreenshots();
      store.setScreenshotAssets(assets);
      if (!assets.length) {
        Alert.alert("Nothing needs your eyes yet", "When screenshots are available, Shepherd will help you understand what they may be holding.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Shepherd could not look through screenshots yet.";
      setLastError(message);
      if (isDemoMode && !isSupabaseConfigured) {
        store.setScreenshotAssets(demoScreenshotAssets);
        Alert.alert("A preview library is ready", "Photo access was not available, so Phone Shepherd prepared a calm sample library.");
        return;
      }
      Alert.alert("Shepherd needs your permission", message);
    } finally {
      store.setIsScanning(false);
    }
  }

  async function analyzeAssets() {
    if (!store.screenshotAssets.length) {
      return;
    }

    store.setIsAnalyzing(true);
    try {
      const analyzed = await analyzeRemoteAssets(store.screenshotAssets.slice(0, 12));
      store.mergeAnalyzedAssets(analyzed);
    } finally {
      store.setIsAnalyzing(false);
    }
  }

  async function persistStatus(id: string, status: ShepherdStatus) {
    const previous = store.screenshotAssets.find((asset) => asset.id === id)?.status ?? "active";
    store.updateLocalStatus(id, status);
    const action = status === "deleted_pending" ? "delete" : status === "archived" ? "archive" : "keep";
    try {
      await applyAction(id, action);
    } catch (error) {
      store.updateLocalStatus(id, previous);
      Alert.alert("Nothing changed", error instanceof Error ? error.message : "Shepherd could not save that choice.");
    }
  }

  return {
    ...store,
    updateLocalStatus: persistStatus,
    stats,
    lastError,
    requestAndScan,
    analyzeAssets
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1_000_000) {
    return `${Math.round(bytes / 1000)} KB`;
  }
  return `${Math.round(bytes / 1_000_000)} MB`;
}

function estimateDuplicates(assets: ShepherdAsset[]) {
  const seen = new Set<string>();
  let duplicates = 0;

  for (const asset of assets) {
    const key = `${asset.width}x${asset.height}-${asset.capturedAt?.slice(0, 10)}`;
    if (seen.has(key)) {
      duplicates += 1;
    }
    seen.add(key);
  }

  return duplicates;
}


