import * as MediaLibrary from "expo-media-library";
import { ShepherdAsset } from "@/types/domain";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function requestMediaPermission() {
  const current = await MediaLibrary.getPermissionsAsync();
  if (current.granted) {
    return current;
  }

  return MediaLibrary.requestPermissionsAsync();
}

export async function scanRecentScreenshots(): Promise<ShepherdAsset[]> {
  const permission = await requestMediaPermission();
  if (!permission.granted) {
    throw new Error("Photo access is needed to scan screenshots.");
  }

  const after = Date.now() - THIRTY_DAYS_MS;
  const page = await MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.photo,
    first: 80,
    sortBy: [MediaLibrary.SortBy.creationTime],
    createdAfter: after
  });

  const assets = page.assets.filter(isLikelyScreenshot);

  return Promise.all(
    assets.map(async (asset) => {
      const info = await MediaLibrary.getAssetInfoAsync(asset);
      return {
        id: asset.id,
        deviceAssetId: asset.id,
        uri: info.localUri || asset.uri,
        filename: asset.filename,
        width: asset.width,
        height: asset.height,
        fileSize: null,
        capturedAt: new Date(asset.creationTime).toISOString(),
        category: "other",
        summary: null,
        reason: null,
        status: "active"
      };
    })
  );
}

function isLikelyScreenshot(asset: MediaLibrary.Asset) {
  const filename = asset.filename.toLowerCase();
  const ratio = asset.height && asset.width ? asset.height / asset.width : 0;
  const nameLooksRight = filename.includes("screenshot") || filename.includes("screen_shot") || filename.includes("screencap");
  const phoneScreenshotRatio = ratio > 1.7 && ratio < 2.4;
  return nameLooksRight || phoneScreenshotRatio;
}
