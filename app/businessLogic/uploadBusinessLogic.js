import crypto from "crypto";
import cloudinary from "@/app/lib/upload/cloudinary"; 

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/*
 * Cloudinary structure:
 *
 * linkstorx/
 *   profiles/
 *     <random-token>.webp   <- sab users ki images ek hi folder mein
 *   products/
 *
 * File ke naam mein userId nahi hota. Naam = 16 hex random token + 12 hex
 * signature. Signature server ke secret se bana hai, isse server verify karta
 * hai ki image kis user ki hai (URL se userId nikal nahi sakta).
 */
const PROFILE_FOLDER = "linkstorx/profiles";
const PROFILE_ID_PATTERN = /^linkstorx\/profiles\/([0-9a-f]{16})([0-9a-f]{12})$/;

function createAppError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/* ---------- ownership signature ---------- */

function sign(userId, token) {
  return crypto
    .createHmac("sha256", process.env.CLOUDINARY_API_SECRET || "")
    .update(`${String(userId)}:${token}`)
    .digest("hex")
    .slice(0, 12);
}

function newProfilePublicId(userId) {
  const token = crypto.randomBytes(8).toString("hex");
  return `${PROFILE_FOLDER}/${token}${sign(userId, token)}`;
}

function isOwnedNewStyle(publicId, userId) {
  const match = PROFILE_ID_PATTERN.exec(publicId);
  if (!match) return false;

  const expected = Buffer.from(sign(userId, match[1]));
  const actual = Buffer.from(match[2]);

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/* Purane (legacy) folders, sirf cleanup ke liye */
function isOwnedLegacy(publicId, userId) {
  const id = String(userId);
  return (
    publicId.startsWith(`linkstorx/users/${id}/profile/`) ||
    publicId.startsWith(`linkstorx/profile-images/${id}/`)
  );
}

function getPublicIdFromUrl(url) {
  const match = String(url || "").match(
    /\/image\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(linkstorx\/.+?)\.[a-zA-Z0-9]+$/
  );
  return match ? match[1] : null;
}

/* ---------- validation ---------- */

function validateImageFile(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw createAppError("No file provided.", 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw createAppError("Only JPG, PNG and WEBP images are allowed.", 400);
  }

  if (file.size === 0) {
    throw createAppError("The selected image is empty.", 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw createAppError("Image must be smaller than 5MB.", 400);
  }
}

/*
 * options:
 *   folder    -> normal upload (Cloudinary random naam dega)
 *   publicId  -> exact naam (folder path ke saath)
 */
async function uploadToCloudinary(file, { folder, publicId } = {}) {
  validateImageFile(file);

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw createAppError("Cloudinary configuration is missing.", 500);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const form = new FormData();

  form.append("file", new Blob([buffer], { type: file.type }), "image");

  if (publicId) {
    form.append("public_id", publicId);
  } else if (folder) {
    form.append("folder", folder);
  }

  form.append("format", "webp"); // hamesha WebP mein store hoga
  // safety net: browser pehle hi compress kar chuka hota hai
  form.append("transformation", "c_limit,w_1000,h_1250/q_auto:eco");

  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  let response;

  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
        },
        body: form,
        cache: "no-store",
      }
    );
  } catch (error) {
    console.error("CLOUDINARY NETWORK ERROR:", error.message);
    throw createAppError("Could not connect to Cloudinary.", 502);
  }

  const responseBody = await response.text();

  let result;

  try {
    result = JSON.parse(responseBody);
  } catch {
    result = { message: responseBody };
  }

  if (!response.ok) {
    console.error("CLOUDINARY RAW ERROR:", {
      status: response.status,
      cldError: response.headers.get("x-cld-error"),
      body: result,
    });

    throw createAppError(
      result?.error?.message ||
        result?.message ||
        `Cloudinary upload failed with HTTP ${response.status}.`,
      502
    );
  }

  if (!result.secure_url) {
    console.error("CLOUDINARY RESPONSE MISSING URL:", result);
    throw createAppError("Cloudinary did not return an image URL.", 502);
  }

  return result.secure_url;
}

/* ---------- public API ---------- */

export async function uploadProfileImage(file, userId) {
  return uploadToCloudinary(file, { publicId: newProfilePublicId(userId) });
}

export async function uploadProductImage(file) {
  return uploadToCloudinary(file, { folder: "linkstorx/products" });
}

/*
 * Kya ye image is user ki hai? (naya signed naam ya purana legacy folder)
 * profileBusinessLogic isse use karta hai taaki koi doosre user ki image
 * apni profile mein laga kar delete na karwa sake.
 */
export function isProfileImageOwnedBy(url, userId) {
  const publicId = getPublicIdFromUrl(url);

  if (!publicId) return false;

  return isOwnedNewStyle(publicId, userId) || isOwnedLegacy(publicId, userId);
}

/* Purani image Cloudinary se delete (sirf us user ki apni image) */
export async function deleteProfileImage(url, userId) {
  const publicId = getPublicIdFromUrl(url);

  if (!publicId) return;

  if (!isOwnedNewStyle(publicId, userId) && !isOwnedLegacy(publicId, userId)) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
  } catch (error) {
    console.error("CLOUDINARY DELETE ERROR:", error.message);
  }
}