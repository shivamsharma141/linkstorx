import cloudinary from "@/app/lib/upload/cloudinary";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function createAppError(message, statusCode) {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
}

function validateImageFile(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw createAppError("No file provided.", 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw createAppError(
      "Only JPG, PNG and WEBP images are allowed.",
      400
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw createAppError(
      "Image must be smaller than 5MB.",
      400
    );
  }
}

async function uploadToCloudinary(file, folder) {
  validateImageFile(file);

  const arrayBuffer = await file.arrayBuffer();

  const buffer = Buffer.from(arrayBuffer);

  const base64 = buffer.toString("base64");

  const dataUri = `data:${file.type};base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: "image",
  });

  /* Only the secure_url is ever persisted - never base64/binary data. */
  return result.secure_url;
}

/* =========================================================
   PROFILE IMAGE (existing — unchanged)
========================================================= */

export async function uploadProfileImage(file) {
  return uploadToCloudinary(file, "linkstorx/profile-images");
}

/* =========================================================
   PRODUCT IMAGES (new)
========================================================= */

export async function uploadProductImage(file) {
  return uploadToCloudinary(file, "linkstorx/products");
}
