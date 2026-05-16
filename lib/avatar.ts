import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

export type AvatarResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type AvatarSource = 'camera' | 'library';

const BUCKET = 'avatars';
const TARGET_SIZE = 512;
const COMPRESS = 0.85;

// Asks for the right permission, opens the picker (with built-in square
// crop), shrinks the result to TARGET_SIZE, uploads to
// avatars/{userId}/avatar.jpg, then writes the public URL back to
// profiles.avatar_url. Returns the URL on success.
export async function pickAndUploadAvatar(
  source: AvatarSource,
): Promise<AvatarResult<string>> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { ok: false, error: 'Sign in to update your photo.' };

  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return {
      ok: false,
      error:
        source === 'camera'
          ? 'Camera permission denied. Enable it in Settings.'
          : 'Photo library permission denied. Enable it in Settings.',
    };
  }

  const picker =
    source === 'camera'
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

  const result = await picker({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  });

  if (result.canceled) return { ok: false, error: 'Cancelled.' };
  const asset = result.assets?.[0];
  if (!asset?.uri) return { ok: false, error: 'No image selected.' };

  // Down-rez to a square TARGET_SIZE — keeps storage costs low and the
  // round-trip image small enough that the avatar renders quickly anywhere
  // it's loaded.
  const shrunk = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: TARGET_SIZE, height: TARGET_SIZE } }],
    { compress: COMPRESS, format: ImageManipulator.SaveFormat.JPEG },
  );

  // Read the local file as base64, then convert to bytes for the upload.
  // RN doesn't expose Blob/File the way the web SDK expects, so the
  // base64-decoded ArrayBuffer is the most reliable path.
  const b64 = await FileSystem.readAsStringAsync(shrunk.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = decodeBase64(b64);

  // Cache-bust path so a fresh upload doesn't read a stale CDN copy.
  const path = `${userId}/avatar-${Date.now()}.jpg`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (uploadErr) return { ok: false, error: uploadErr.message };

  // Sweep older avatar files for this user so we don't accumulate forever.
  // Best-effort — don't fail the upload if cleanup glitches.
  void cleanupOldAvatars(userId, path);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);
  if (updateErr) return { ok: false, error: updateErr.message };

  return { ok: true, data: publicUrl };
}

// Clears profiles.avatar_url and removes the user's avatar files from storage.
export async function removeAvatar(): Promise<AvatarResult> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { ok: false, error: 'Sign in to update your photo.' };

  await cleanupOldAvatars(userId, null);

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId);
  if (error) return { ok: false, error: error.message };

  return { ok: true, data: undefined };
}

async function cleanupOldAvatars(
  userId: string,
  keep: string | null,
): Promise<void> {
  const { data: list } = await supabase.storage
    .from(BUCKET)
    .list(userId, { limit: 100 });
  if (!list) return;
  const stale = list
    .map((f) => `${userId}/${f.name}`)
    .filter((p) => p !== keep);
  if (stale.length === 0) return;
  await supabase.storage.from(BUCKET).remove(stale);
}

// Tiny base64 decoder — avoids pulling in a polyfill just for this.
function decodeBase64(b64: string): Uint8Array {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  const len = b64.length;
  let bufferLength = (len * 3) >> 2;
  if (b64[len - 1] === '=') bufferLength--;
  if (b64[len - 2] === '=') bufferLength--;
  const bytes = new Uint8Array(bufferLength);
  for (let i = 0, p = 0; i < len; i += 4) {
    const e1 = lookup[b64.charCodeAt(i)];
    const e2 = lookup[b64.charCodeAt(i + 1)];
    const e3 = lookup[b64.charCodeAt(i + 2)];
    const e4 = lookup[b64.charCodeAt(i + 3)];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < bufferLength) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < bufferLength) bytes[p++] = ((e3 & 3) << 6) | e4;
  }
  return bytes;
}
