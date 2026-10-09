/*
|--------------------------------------------------------------------------
| Attendance Photos
|--------------------------------------------------------------------------
| Punch photos are stored on Cloudinary at capture size. The card shows them
| as small avatars, so the URL is rewritten to ask the CDN for exactly that:
|
|   THUMB  480x400 (close to the tile's shape), cropped around the face
|          (g_face), WebP/AVIF, auto quality - tens of KB, sharp on 2x.
|   FULL   up to 1080px wide for the lightbox, never upscaled.
|
| Cloudinary caches each derived size, so only the very first view of a
| photo pays for the transformation. Non-Cloudinary URLs pass through.
|--------------------------------------------------------------------------
*/

const UPLOAD_SEGMENT = "/image/upload/";

export const PHOTO_PRESETS = Object.freeze({
  THUMB: "f_auto,q_auto,c_fill,g_face,w_480,h_400",
  FULL: "f_auto,q_auto,c_limit,w_1080",
});

export const getAttendancePhotoUrl = (url, preset = PHOTO_PRESETS.THUMB) => {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes(UPLOAD_SEGMENT)) {
    return url || "";
  }

  return url.replace(UPLOAD_SEGMENT, `${UPLOAD_SEGMENT}${preset}/`);
};
