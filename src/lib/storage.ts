import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Storage not configured.");
  return createClient(url, key);
}

/**
 * Upload a file to a private Supabase Storage bucket.
 * Returns the storage path (not a public URL).
 */
export async function uploadPrivateFile(
  bucket: string,
  path: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const supabase = getServiceClient();
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

/**
 * Generate a short-lived signed URL for a private file.
 * Expiry is 600 seconds (10 minutes).
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 600
): Promise<string> {
  // Handle legacy rows that stored a full public URL instead of a path.
  // Strip the public URL prefix to recover the storage path.
  const publicPrefix = `/storage/v1/object/public/${bucket}/`;
  const idx = path.indexOf(publicPrefix);
  if (idx !== -1) {
    path = path.substring(idx + publicPrefix.length);
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

/**
 * Generate signed URLs for multiple files in one call.
 */
export async function getSignedUrls(
  bucket: string,
  paths: string[],
  expiresIn = 600
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();

  const normalizedPaths = paths.map((p) => {
    const publicPrefix = `/storage/v1/object/public/${bucket}/`;
    const idx = p.indexOf(publicPrefix);
    if (idx !== -1) return p.substring(idx + publicPrefix.length);
    return p;
  });

  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(normalizedPaths, expiresIn);
  if (error) throw new Error(`Signed URLs failed: ${error.message}`);

  const map = new Map<string, string>();
  for (let i = 0; i < paths.length; i++) {
    if (data[i]?.signedUrl) {
      map.set(paths[i], data[i].signedUrl!);
    }
  }
  return map;
}
