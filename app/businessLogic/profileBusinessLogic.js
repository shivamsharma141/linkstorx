import {
  findProfileByUserId,
  findProfileByUsername,
  createProfile,
  updateProfile,
  setProfilePublished,
  checkUsernameExists,
} from "@/app/databaseQueries/profileDatabaseQueries";

import {
  deleteProfileImage,
  isProfileImageOwnedBy,
} from "@/app/businessLogic/uploadBusinessLogic";

/* =========================================================
   CONSTANTS
========================================================= */

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

const SOCIAL_PLATFORMS = [
  "instagram",
  "youtube",
  "linkedin",
  "whatsapp",
  "x",
  "facebook",
  "telegram",
  "website",
];

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

const DEFAULT_ACCENT = "#2563eb";
const DEFAULT_BACKGROUND = "#f5f0e9";

/* Bio limit: max 150 words (database bharne se bachane ke liye) */
const MAX_BIO_WORDS = 150;
const MAX_BIO_CHARS = 1500; // safety net, model ke maxlength se match karta hai

/* =========================================================
   ERROR HELPER
========================================================= */

function createAppError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
}

/* =========================================================
   URL HELPERS
========================================================= */

function normalizeUrl(url) {
  const value = String(url || "").trim();

  if (!value) {
    return "";
  }

  if (
    value.startsWith("https://") ||
    value.startsWith("http://") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("whatsapp:")
  ) {
    return value;
  }

  // instagram.com/shivam -> https://instagram.com/shivam
  return `https://${value}`;
}

/* =========================================================
   PLAIN OBJECT MAPPERS
========================================================= */

function mapLink(item) {
  return {
    id: item._id.toString(),
    title: item.title,
    url: item.url,
    icon: item.icon,
    enabled: item.enabled,
    position: item.position,
  };
}

function mapButton(item) {
  return {
    id: item._id.toString(),
    label: item.label,
    url: item.url,
    enabled: item.enabled,
    position: item.position,
  };
}

function mapSocialIcon(item) {
  return {
    id: item._id.toString(),
    platform: item.platform,
    url: item.url,
    enabled: item.enabled,
  };
}

/* =========================================================
   PROFILE -> PLAIN OBJECT
========================================================= */

function toPlainProfile(profile, { publicOnly = false } = {}) {
  if (!profile) {
    return null;
  }

  const filterEnabled = (items) =>
    publicOnly ? items.filter((item) => item.enabled) : items;

  const sortByPosition = (items) =>
    [...items].sort((a, b) => a.position - b.position);

  return {
    username: profile.publicUsername,

    displayName: profile.displayName,

    bio: profile.bio,

    profileImage: profile.profileImage,

    categoryTags: profile.categoryTags || [],

    primaryButtons: sortByPosition(
      filterEnabled((profile.primaryButtons || []).map(mapButton))
    ),

    links: sortByPosition(
      filterEnabled((profile.links || []).map(mapLink))
    ),

    socialIcons: filterEnabled(
      (profile.socialIcons || []).map(mapSocialIcon)
    ),

    theme: {
      accentColor: profile.theme?.accentColor || DEFAULT_ACCENT,
      backgroundColor: profile.theme?.backgroundColor || DEFAULT_BACKGROUND,
    },

    isPublished: Boolean(profile.isPublished),

    publishedAt: profile.publishedAt
      ? new Date(profile.publishedAt).toISOString()
      : null,
  };
}

/* =========================================================
   VALIDATION
========================================================= */

function validateUsername(username) {
  if (!username) {
    throw createAppError("Username is required.", 400);
  }

  const normalized = String(username).trim().toLowerCase();

  if (normalized.length < 3) {
    throw createAppError("Username must be at least 3 characters.", 400);
  }

  if (!USERNAME_PATTERN.test(normalized)) {
    throw createAppError(
      "Username can only contain letters, numbers and underscores.",
      400
    );
  }

  return normalized;
}

function validateDisplayName(displayName) {
  if (displayName && String(displayName).length > 60) {
    throw createAppError("Display name must be under 60 characters.", 400);
  }

  return displayName ? String(displayName).trim() : "";
}

/* Bio: max 150 words (frontend pehle hi kaat deta hai, yeh server-side guard hai) */
function validateBio(bio) {
  const value = bio ? String(bio).trim() : "";

  const words = (value.match(/\S+/g) || []).length;

  if (words > MAX_BIO_WORDS) {
    throw createAppError(`Bio can be at most ${MAX_BIO_WORDS} words.`, 400);
  }

  if (value.length > MAX_BIO_CHARS) {
    throw createAppError("Bio is too long.", 400);
  }

  return value;
}

/*
 * Profile image rules:
 *  - khali ho sakti hai (image hata di)
 *  - https URL honi chahiye
 *  - ya toh wahi image jo pehle se saved hai, ya is user ki apni uploaded
 *    image. Doosre user ki image ka URL accept nahi hota.
 */
function validateProfileImage(url, userId, currentImage) {
  if (!url) {
    return "";
  }

  const normalized = String(url).trim();

  if (!/^https:\/\//i.test(normalized)) {
    throw createAppError("Invalid profile image URL.", 400);
  }

  if (
    normalized !== (currentImage || "") &&
    !isProfileImageOwnedBy(normalized, userId)
  ) {
    throw createAppError("Invalid profile image.", 400);
  }

  return normalized;
}

function validateCategoryTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  if (tags.length > 5) {
    throw createAppError("You can add up to 5 category tags.", 400);
  }

  return tags
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

/*
 * Empty link rows (no title, no url) are ignored.
 * A row with only one of them filled is a validation error.
 */
function validateLinks(links) {
  if (!Array.isArray(links)) {
    return [];
  }

  const filled = links.filter(
    (link) =>
      String(link?.title || "").trim() !== "" ||
      String(link?.url || "").trim() !== ""
  );

  return filled.map((link, index) => {
    const title = String(link?.title || "").trim();
    const url = normalizeUrl(link?.url);

    if (!title || !url) {
      throw createAppError("Each link needs a title and a URL.", 400);
    }

    return {
      title,
      url,
      icon: link?.icon ? String(link.icon).trim() : "",
      enabled: link?.enabled === undefined ? true : Boolean(link.enabled),
      position: typeof link?.position === "number" ? link.position : index,
    };
  });
}

/*
 * Buttons are allowed to have an empty URL so the user can
 * create a button first and add the destination later.
 */
function validatePrimaryButtons(buttons) {
  if (!Array.isArray(buttons)) {
    return [];
  }

  const filled = buttons.filter(
    (button) =>
      String(button?.label || "").trim() !== "" ||
      String(button?.url || "").trim() !== ""
  );

  return filled.map((button, index) => {
    const label = String(button?.label || "").trim();
    const url = normalizeUrl(button?.url);

    if (!label) {
      throw createAppError("Each button needs a label.", 400);
    }

    return {
      label,
      url,
      enabled: button?.enabled === undefined ? true : Boolean(button.enabled),
      position: typeof button?.position === "number" ? button.position : index,
    };
  });
}

/*
 * Only supported platforms are kept. Empty URL => enabled=false,
 * so an empty icon never appears publicly.
 */
function validateSocialIcons(icons) {
  if (!Array.isArray(icons)) {
    return [];
  }

  return icons
    .filter((icon) => SOCIAL_PLATFORMS.includes(icon?.platform))
    .map((icon) => {
      const url = normalizeUrl(icon?.url);

      return {
        platform: icon.platform,
        url,
        enabled: Boolean(icon?.enabled) && Boolean(url),
      };
    });
}

function validateAccentColor(color) {
  if (!color) {
    return DEFAULT_ACCENT;
  }

  const normalized = String(color).trim();

  if (!HEX_COLOR_PATTERN.test(normalized)) {
    throw createAppError("Invalid accent color.", 400);
  }

  return normalized;
}

function validateBackgroundColor(color) {
  if (!color) {
    return DEFAULT_BACKGROUND;
  }

  const normalized = String(color).trim();

  if (!HEX_COLOR_PATTERN.test(normalized)) {
    throw createAppError("Invalid background color.", 400);
  }

  return normalized;
}

/* =========================================================
   DASHBOARD READ
========================================================= */

export async function getProfileForDashboard(userId, accountUsername) {
  const profile = await findProfileByUserId(userId);

  // No profile yet -> full default structure for the editor
  if (!profile) {
    return {
      exists: false,

      username: "",

      suggestedUsername: accountUsername || "",

      displayName: "",

      bio: "",

      profileImage: "",

      categoryTags: [],

      primaryButtons: [],

      links: [],

      socialIcons: SOCIAL_PLATFORMS.map((platform) => ({
        id: null,
        platform,
        url: "",
        enabled: false,
      })),

      theme: {
        accentColor: DEFAULT_ACCENT,
        backgroundColor: DEFAULT_BACKGROUND,
      },

      isPublished: false,

      publishedAt: null,
    };
  }

  // Existing profile -> make sure every platform is present
  const socialMap = new Map(
    (profile.socialIcons || []).map((item) => [item.platform, item])
  );

  const normalizedSocialIcons = SOCIAL_PLATFORMS.map((platform) => {
    const existing = socialMap.get(platform);

    if (existing) {
      return {
        id: existing._id.toString(),
        platform,
        url: existing.url || "",
        enabled:
          Boolean(existing.enabled) &&
          Boolean(String(existing.url || "").trim()),
      };
    }

    return {
      id: null,
      platform,
      url: "",
      enabled: false,
    };
  });

  return {
    exists: true,

    ...toPlainProfile(profile),

    socialIcons: normalizedSocialIcons,
  };
}

/* =========================================================
   PUBLIC PROFILE READ

   - Published profile  -> sab dekh sakte hain.
   - Draft profile      -> sirf owner (viewerUserId match) dekh sakta
                           hai (dashboard preview ke liye). Baaki sab
                           ko 404.

   Store page bhi isi function se gate hota hai.
========================================================= */

export async function getPublicProfile(username, viewerUserId = null) {
  if (!username) {
    throw createAppError("Profile not found.", 404);
  }

  const normalized = String(username).trim().toLowerCase();

  const profile = await findProfileByUsername(normalized);

  if (!profile) {
    throw createAppError("Profile not found.", 404);
  }

  if (!profile.isPublished) {
    const isOwner =
      Boolean(viewerUserId) &&
      String(profile.userId) === String(viewerUserId);

    if (!isOwner) {
      throw createAppError("Profile not found.", 404);
    }
  }

  return toPlainProfile(profile, { publicOnly: true });
}

/* =========================================================
   USERNAME AVAILABILITY
========================================================= */

export async function checkUsernameAvailability(username, currentUserId) {
  const normalized = validateUsername(username);

  const exists = await checkUsernameExists(normalized, currentUserId);

  return {
    username: normalized,
    available: !exists,
  };
}

/* =========================================================
   SAVE PROFILE

   Draft aur published dono mein same save chalta hai.
   isPublished yahan kabhi change nahi hota -> published page
   pe har auto-save seedha live ho jata hai, draft draft hi
   rehta hai.
========================================================= */

export async function saveProfile(userId, data) {
  if (!userId) {
    throw createAppError("User authentication is required.", 401);
  }

  if (!data || typeof data !== "object") {
    throw createAppError("Invalid profile data.", 400);
  }

  const username = validateUsername(data.username);

  // Current user's own profile is excluded from this check
  const usernameTaken = await checkUsernameExists(username, userId);

  if (usernameTaken) {
    throw createAppError("This username is already taken.", 409);
  }

  const existingProfile = await findProfileByUserId(userId);
  const oldProfileImage = existingProfile?.profileImage || "";

  const payload = {
    userId,

    publicUsername: username,

    displayName: validateDisplayName(data.displayName),

    bio: validateBio(data.bio),

    profileImage: validateProfileImage(
      data.profileImage,
      userId,
      oldProfileImage
    ),

    categoryTags: validateCategoryTags(data.categoryTags),

    primaryButtons: validatePrimaryButtons(data.primaryButtons),

    links: validateLinks(data.links),

    socialIcons: validateSocialIcons(data.socialIcons),

    theme: {
      accentColor: validateAccentColor(data.theme?.accentColor),
      backgroundColor: validateBackgroundColor(data.theme?.backgroundColor),
    },
  };

  let profile;

  if (existingProfile) {
    profile = await updateProfile(userId, payload);
  } else {
    // New profile always starts as draft (isPublished default false)
    profile = await createProfile(payload);
  }

  if (!profile) {
    throw createAppError("Unable to save profile.", 500);
  }

  // Image badli hai toh purani Cloudinary se delete karo
  if (oldProfileImage && oldProfileImage !== payload.profileImage) {
    await deleteProfileImage(oldProfileImage, userId);
  }

  return {
    exists: true,

    ...toPlainProfile(profile),
  };
}

/* =========================================================
   PUBLISH

   Sirf publish hai. Unpublish system hata diya gaya hai:
   ek baar publish hone ke baad page live hi rehta hai.
========================================================= */

export async function publishProfile(userId) {
  if (!userId) {
    throw createAppError("User authentication is required.", 401);
  }

  const existingProfile = await findProfileByUserId(userId);

  // Profile abhi save hi nahi hui -> publish nahi ho sakta
  if (!existingProfile) {
    throw createAppError(
      "Please complete and save your profile before publishing.",
      400
    );
  }

  const profile = await setProfilePublished(userId);

  if (!profile) {
    throw createAppError("Unable to publish profile.", 500);
  }

  return {
    exists: true,

    ...toPlainProfile(profile),
  };
}