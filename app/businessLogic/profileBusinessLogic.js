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

import { getTheme, isValidThemeId, DEFAULT_THEME_ID } from "@/app/lib/theme/profileThemes";

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

/* Bio limit: max 50 words */
const MAX_BIO_WORDS = 50;
const MAX_BIO_CHARS = 500;

const MAX_PILL_CHARS = 30;
const DEFAULT_PILL_TEXT = "Available for work";
const MAX_SUBTITLE_CHARS = 60;

/* =========================================================
   ERROR HELPER
========================================================= */

function createAppError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/* =========================================================
   SUBSCRIPTION HOOK
   Verified badge abhi har seller ke liye allowed hai.
   Subscription banne ke baad sirf yahan check lagana:
     const sub = await findSubscriptionByUserId(userId);
     return Boolean(sub?.active);
========================================================= */

async function canUseVerifiedBadge(userId) {
  return true;
}

/* =========================================================
   URL HELPERS
========================================================= */

function normalizeUrl(url) {
  const value = String(url || "").trim();

  if (!value) return "";

  if (
    value.startsWith("https://") ||
    value.startsWith("http://") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("whatsapp:")
  ) {
    return value;
  }

  return `https://${value}`;
}

/* =========================================================
   PLAIN OBJECT MAPPERS
========================================================= */

function mapLink(item) {
  return {
    id: item._id.toString(),
    title: item.title,
    subtitle: item.subtitle || "",
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
  if (!profile) return null;

  const filterEnabled = (items) =>
    publicOnly ? items.filter((item) => item.enabled) : items;

  const sortByPosition = (items) =>
    [...items].sort((a, b) => a.position - b.position);

  const theme = getTheme(profile.theme);

  return {
    username: profile.publicUsername,
    displayName: profile.displayName,
    bio: profile.bio,
    profileImage: profile.profileImage,
    signatureImage: profile.signatureImage || "",
    verifiedBadge: Boolean(profile.verifiedBadge),

    availableForWork: {
      enabled: Boolean(profile.availableForWork?.enabled),
      text: profile.availableForWork?.text || DEFAULT_PILL_TEXT,
    },

    categoryTags: profile.categoryTags || [],

    primaryButtons: sortByPosition(
      filterEnabled((profile.primaryButtons || []).map(mapButton))
    ),

    links: sortByPosition(filterEnabled((profile.links || []).map(mapLink))),

    socialIcons: filterEnabled((profile.socialIcons || []).map(mapSocialIcon)),

    theme: {
      themeId: theme.id,
      accentColor: theme.accent,
      backgroundColor: theme.bg,
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
 * Profile photo + signature dono ke liye:
 *  - khali ho sakti hai
 *  - https URL honi chahiye
 *  - wahi image jo pehle se saved hai, ya is user ki apni uploaded image
 */
function validateOwnedImage(url, userId, currentImage, label = "image") {
  if (!url) return "";

  const normalized = String(url).trim();

  if (!/^https:\/\//i.test(normalized)) {
    throw createAppError(`Invalid ${label} URL.`, 400);
  }

  if (
    normalized !== (currentImage || "") &&
    !isProfileImageOwnedBy(normalized, userId)
  ) {
    throw createAppError(`Invalid ${label}.`, 400);
  }

  return normalized;
}

function validateCategoryTags(tags) {
  if (!Array.isArray(tags)) return [];

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
  if (!Array.isArray(links)) return [];

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
      subtitle: String(link?.subtitle || "").trim().slice(0, MAX_SUBTITLE_CHARS),
      url,
      icon: link?.icon ? String(link.icon).trim() : "",
      enabled: link?.enabled === undefined ? true : Boolean(link.enabled),
      position: typeof link?.position === "number" ? link.position : index,
    };
  });
}

/* Buttons may have an empty URL (destination can be added later). */
function validatePrimaryButtons(buttons) {
  if (!Array.isArray(buttons)) return [];

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

function validateSocialIcons(icons) {
  if (!Array.isArray(icons)) return [];

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

function validateAvailableForWork(value) {
  const text =
    String(value?.text || "").trim().slice(0, MAX_PILL_CHARS) || DEFAULT_PILL_TEXT;

  return {
    enabled: Boolean(value?.enabled),
    text,
  };
}

/* Client sirf themeId bhejta hai. Colors server khud nikalta hai. */
function validateTheme(theme) {
  const id = isValidThemeId(theme?.themeId) ? theme.themeId : DEFAULT_THEME_ID;
  const resolved = getTheme({ themeId: id });

  return {
    themeId: resolved.id,
    accentColor: resolved.accent,
    backgroundColor: resolved.bg,
  };
}

/* =========================================================
   DASHBOARD READ
========================================================= */

export async function getProfileForDashboard(userId, accountUsername) {
  const profile = await findProfileByUserId(userId);

  if (!profile) {
    const defaultTheme = getTheme({ themeId: DEFAULT_THEME_ID });

    return {
      exists: false,
      username: "",
      suggestedUsername: accountUsername || "",
      displayName: "",
      bio: "",
      profileImage: "",
      signatureImage: "",
      verifiedBadge: false,
      availableForWork: { enabled: false, text: DEFAULT_PILL_TEXT },
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
        themeId: defaultTheme.id,
        accentColor: defaultTheme.accent,
        backgroundColor: defaultTheme.bg,
      },
      isPublished: false,
      publishedAt: null,
    };
  }

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

    return { id: null, platform, url: "", enabled: false };
  });

  return {
    exists: true,
    ...toPlainProfile(profile),
    socialIcons: normalizedSocialIcons,
  };
}

/* =========================================================
   PUBLIC PROFILE READ
   Published -> sab dekh sakte hain. Draft -> sirf owner.
   Store page bhi isi se gate hota hai.
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
   isPublished yahan kabhi change nahi hota.
========================================================= */

export async function saveProfile(userId, data) {
  if (!userId) {
    throw createAppError("User authentication is required.", 401);
  }

  if (!data || typeof data !== "object") {
    throw createAppError("Invalid profile data.", 400);
  }

  const username = validateUsername(data.username);

  const usernameTaken = await checkUsernameExists(username, userId);

  if (usernameTaken) {
    throw createAppError("This username is already taken.", 409);
  }

  const existingProfile = await findProfileByUserId(userId);
  const oldProfileImage = existingProfile?.profileImage || "";
  const oldSignatureImage = existingProfile?.signatureImage || "";

  const payload = {
    userId,
    publicUsername: username,
    displayName: validateDisplayName(data.displayName),
    bio: validateBio(data.bio),

    profileImage: validateOwnedImage(
      data.profileImage,
      userId,
      oldProfileImage,
      "profile image"
    ),

    signatureImage: validateOwnedImage(
      data.signatureImage,
      userId,
      oldSignatureImage,
      "signature image"
    ),

    verifiedBadge:
      Boolean(data.verifiedBadge) && (await canUseVerifiedBadge(userId)),

    availableForWork: validateAvailableForWork(data.availableForWork),

    categoryTags: validateCategoryTags(data.categoryTags),
    primaryButtons: validatePrimaryButtons(data.primaryButtons),
    links: validateLinks(data.links),
    socialIcons: validateSocialIcons(data.socialIcons),
    theme: validateTheme(data.theme),
  };

  let profile;

  if (existingProfile) {
    profile = await updateProfile(userId, payload);
  } else {
    profile = await createProfile(payload);
  }

  if (!profile) {
    throw createAppError("Unable to save profile.", 500);
  }

  if (oldProfileImage && oldProfileImage !== payload.profileImage) {
    await deleteProfileImage(oldProfileImage, userId);
  }

  if (oldSignatureImage && oldSignatureImage !== payload.signatureImage) {
    await deleteProfileImage(oldSignatureImage, userId);
  }

  return {
    exists: true,
    ...toPlainProfile(profile),
  };
}

/* =========================================================
   PUBLISH (sirf publish, unpublish nahi)
========================================================= */

export async function publishProfile(userId) {
  if (!userId) {
    throw createAppError("User authentication is required.", 401);
  }

  const existingProfile = await findProfileByUserId(userId);

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