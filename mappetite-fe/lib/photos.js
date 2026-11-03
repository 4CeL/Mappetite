import { api, ApiError } from "./api";

export const MAX_PHOTOS = 5;

/**
 * A photo in a form is one of:
 *   { key, kind: "existing", id, url }                      already saved on the server
 *   { key, kind: "new", blob, width, height, url }          compressed, not uploaded yet (`url` is a blob: preview)
 * The first item is the cover photo.
 */

export function photoItemsFromPlace(place) {
  return (place.photos || []).map((photo) => ({ key: photo.id, kind: "existing", id: photo.id, url: photo.url }));
}

/** Direct upload to Supabase Storage with the signed URL the backend handed out. */
async function putFile(uploadUrl, blob) {
  let response;
  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": blob.type, "Cache-Control": "max-age=31536000", "x-upsert": "false" },
      body: blob,
    });
  } catch {
    throw new ApiError(0, "places.photo_failed", "Upload failed");
  }
  if (!response.ok) throw new ApiError(response.status, "places.photo_failed", "Upload failed");
}

async function uploadPhoto(placeId, item) {
  const { upload_url: uploadUrl, path } = await api.photoUploadUrl(placeId, {
    content_type: item.blob.type,
    size: item.blob.size,
  });
  await putFile(uploadUrl, item.blob);
  return api.confirmPhoto(placeId, { path, width: item.width, height: item.height });
}

/**
 * Make the server's photos match the form's list: delete removed ones, upload new ones, then move the
 * chosen cover to the front. Never throws.
 *
 * Returns { place, failed } where `place` is the freshest copy (re-fetched only if something changed)
 * and `failed` lists the new items that did not upload plus a count of deletions that did not go through.
 */
export async function syncPhotos(place, items) {
  const keep = new Set(items.filter((item) => item.kind === "existing").map((item) => item.id));
  const remaining = (place.photos || []).map((photo) => photo.id);
  const failedUploads = [];
  let failedDeletes = 0;
  let changed = false;

  for (const photo of place.photos || []) {
    if (keep.has(photo.id)) continue;
    try {
      await api.deletePhoto(place.id, photo.id);
      remaining.splice(remaining.indexOf(photo.id), 1);
      changed = true;
    } catch {
      failedDeletes += 1;
    }
  }

  const idByKey = new Map(items.filter((item) => item.kind === "existing").map((item) => [item.key, item.id]));
  for (const item of items) {
    if (item.kind !== "new") continue;
    try {
      const saved = await uploadPhoto(place.id, item);
      idByKey.set(item.key, saved.id);
      remaining.push(saved.id);
      changed = true;
    } catch {
      failedUploads.push(item);
    }
  }

  // The first item that exists on the server is the wanted cover.
  const wanted = items.map((item) => idByKey.get(item.key)).find((id) => id && remaining.includes(id));
  if (wanted && wanted !== remaining[0]) {
    try {
      await api.setCoverPhoto(place.id, wanted);
      changed = true;
    } catch {
      failedDeletes += 1; // counted as "something did not go through" so the user is told
    }
  }

  let fresh = place;
  if (changed) {
    try {
      fresh = await api.getPlace(place.id);
    } catch {
      fresh = place;
    }
  }
  return { place: fresh, failed: failedUploads, failedOther: failedDeletes };
}
