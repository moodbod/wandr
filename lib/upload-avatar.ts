import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import type { Id } from '@/convex/_generated/dataModel';

type AvatarAsset = {
  uri: string;
  mimeType?: string | null;
};

/**
 * Uploads a picked image asset to a Convex storage upload URL and returns the
 * resulting storage id.
 *
 * On native we use `expo-file-system`'s `uploadAsync`, which streams the file
 * directly from disk. The previous `fetch(fileUri).blob()` + POST approach is
 * unreliable on React Native — the Blob body frequently uploads as zero bytes,
 * producing a stored-but-empty file that never renders. On web, `uploadAsync`
 * is unsupported, so we keep the blob path there (where it works correctly).
 */
export async function uploadAvatarAsset(uploadUrl: string, asset: AvatarAsset): Promise<Id<'_storage'>> {
  const contentType = asset.mimeType ?? 'image/jpeg';

  if (Platform.OS === 'web') {
    const photoResponse = await fetch(asset.uri);
    const blob = await photoResponse.blob();
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': blob.type || contentType },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Avatar upload failed (${uploadResponse.status}).`);
    }

    const { storageId } = (await uploadResponse.json()) as { storageId: Id<'_storage'> };
    return storageId;
  }

  const result = await FileSystem.uploadAsync(uploadUrl, asset.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Avatar upload failed (${result.status}).`);
  }

  const { storageId } = JSON.parse(result.body) as { storageId: Id<'_storage'> };
  return storageId;
}
