import {
  findProfileByUserId,
  findProfileByUsername,
  createProfile,
  updateProfile,
  checkUsernameExists,
} from "@/app/databaseQueries/profileDatabaseQueries";

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

  /*
   * Already valid URL/protocol.
   */
  if (
    value.startsWith("https://") ||
    value.startsWith("http://") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("whatsapp:")
  ) {
    return value;
  }

  /*
   * User can simply enter:
   *
   * instagram.com/shivam
   * youtube.com/@shivam
   * example.com
   *
   * We automatically make it clickable.
   */
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

function toPlainProfile(
  profile,
  { publicOnly = false } = {}
) {
  if (!profile) {
    return null;
  }

  const filterEnabled = (items) => {
    return publicOnly
      ? items.filter((item) => item.enabled)
      : items;
  };

  const sortByPosition = (items) => {
    return [...items].sort(
      (a, b) => a.position - b.position
    );
  };

  return {
    username: profile.publicUsername,

    displayName: profile.displayName,

    bio: profile.bio,

    profileImage: profile.profileImage,

    categoryTags: profile.categoryTags || [],

    primaryButtons: sortByPosition(
      filterEnabled(
        (profile.primaryButtons || []).map(
          mapButton
        )
      )
    ),

    links: sortByPosition(
      filterEnabled(
        (profile.links || []).map(mapLink)
      )
    ),

    socialIcons: filterEnabled(
      (profile.socialIcons || []).map(
        mapSocialIcon
      )
    ),

    theme: {
      accentColor:
        profile.theme?.accentColor ||
        "#2563eb",
    },
  };
}

/* =========================================================
   USERNAME VALIDATION
========================================================= */

function validateUsername(username) {
  if (!username) {
    throw createAppError(
      "Username is required.",
      400
    );
  }

  const normalized = String(username)
    .trim()
    .toLowerCase();

  if (normalized.length < 3) {
    throw createAppError(
      "Username must be at least 3 characters.",
      400
    );
  }

  if (!USERNAME_PATTERN.test(normalized)) {
    throw createAppError(
      "Username can only contain letters, numbers and underscores.",
      400
    );
  }

  return normalized;
}

/* =========================================================
   DISPLAY NAME VALIDATION
========================================================= */

function validateDisplayName(displayName) {
  if (
    displayName &&
    String(displayName).length > 60
  ) {
    throw createAppError(
      "Display name must be under 60 characters.",
      400
    );
  }

  return displayName
    ? String(displayName).trim()
    : "";
}

/* =========================================================
   BIO VALIDATION
========================================================= */

function validateBio(bio) {
  if (
    bio &&
    String(bio).length > 300
  ) {
    throw createAppError(
      "Bio must be under 300 characters.",
      400
    );
  }

  return bio
    ? String(bio).trim()
    : "";
}

/* =========================================================
   PROFILE IMAGE VALIDATION
========================================================= */

function validateProfileImage(url) {
  if (!url) {
    return "";
  }

  const normalized = String(url).trim();

  if (!/^https:\/\//i.test(normalized)) {
    throw createAppError(
      "Invalid profile image URL.",
      400
    );
  }

  return normalized;
}

/* =========================================================
   CATEGORY TAGS
========================================================= */

function validateCategoryTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  if (tags.length > 5) {
    throw createAppError(
      "You can add up to 5 category tags.",
      400
    );
  }

  return tags
    .map((tag) =>
      String(tag || "").trim()
    )
    .filter(Boolean)
    .slice(0, 5);
}

/* =========================================================
   LINKS VALIDATION
========================================================= */

/*
 * Empty link rows are ignored.
 *
 * Example:
 *
 * title: ""
 * url: ""
 *
 * => ignored
 *
 * But:
 *
 * title: "Instagram"
 * url: ""
 *
 * => validation error
 */

function validateLinks(links) {
  if (!Array.isArray(links)) {
    return [];
  }

  const filled = links.filter(
    (link) =>
      String(link?.title || "").trim() !==
        "" ||
      String(link?.url || "").trim() !== ""
  );

  return filled.map((link, index) => {
    const title = String(
      link?.title || ""
    ).trim();

    const url = normalizeUrl(
      link?.url
    );

    if (!title || !url) {
      throw createAppError(
        "Each link needs a title and a URL.",
        400
      );
    }

    return {
      title,

      url,

      icon: link?.icon
        ? String(link.icon).trim()
        : "",

      enabled:
        link?.enabled === undefined
          ? true
          : Boolean(link.enabled),

      position:
        typeof link?.position === "number"
          ? link.position
          : index,
    };
  });
}

/* =========================================================
   PRIMARY BUTTON VALIDATION
========================================================= */

/*
 * Buttons are intentionally allowed to have
 * an empty URL.
 *
 * This allows the user to create/edit a button
 * before adding the destination.
 */

function validatePrimaryButtons(buttons) {
  if (!Array.isArray(buttons)) {
    return [];
  }

  const filled = buttons.filter(
    (button) =>
      String(button?.label || "").trim() !==
        "" ||
      String(button?.url || "").trim() !== ""
  );

  return filled.map((button, index) => {
    const label = String(
      button?.label || ""
    ).trim();

    const url = normalizeUrl(
      button?.url
    );

    if (!label) {
      throw createAppError(
        "Each button needs a label.",
        400
      );
    }

    return {
      label,

      url,

      enabled:
        button?.enabled === undefined
          ? true
          : Boolean(button.enabled),

      position:
        typeof button?.position === "number"
          ? button.position
          : index,
    };
  });
}

/* =========================================================
   SOCIAL ICON VALIDATION
========================================================= */

function validateSocialIcons(icons) {
  if (!Array.isArray(icons)) {
    return [];
  }

  /*
   * Always preserve only supported platforms.
   *
   * If URL is empty:
   *
   * enabled = false
   *
   * This prevents an empty social icon
   * from appearing publicly.
   */

  return icons
    .filter((icon) =>
      SOCIAL_PLATFORMS.includes(
        icon?.platform
      )
    )
    .map((icon) => {
      const url = normalizeUrl(
        icon?.url
      );

      return {
        platform: icon.platform,

        url,

        enabled:
          Boolean(icon?.enabled) &&
          Boolean(url),
      };
    });
}

/* =========================================================
   ACCENT COLOR VALIDATION
========================================================= */

function validateAccentColor(color) {
  if (!color) {
    return "#2563eb";
  }

  const normalized = String(
    color
  ).trim();

  if (
    !HEX_COLOR_PATTERN.test(normalized)
  ) {
    throw createAppError(
      "Invalid accent color.",
      400
    );
  }

  return normalized;
}

/* =========================================================
   DASHBOARD READ
========================================================= */

export async function getProfileForDashboard(
  userId,
  accountUsername
) {
  const profile =
    await findProfileByUserId(userId);

  /*
   * No profile exists yet.
   *
   * Return a complete default structure so
   * ProfileEditor does not have to deal with
   * undefined fields.
   */

  if (!profile) {
    return {
      exists: false,

      username: "",

      suggestedUsername:
        accountUsername || "",

      displayName: "",

      bio: "",

      profileImage: "",

      categoryTags: [],

      primaryButtons: [],

      links: [],

      /*
       * Return every supported social platform.
       *
       * This makes the Social Icons editor
       * immediately show all platforms.
       */

      socialIcons:
        SOCIAL_PLATFORMS.map(
          (platform) => ({
            id: null,

            platform,

            url: "",

            enabled: false,
          })
        ),

      theme: {
        accentColor: "#2563eb",
      },
    };
  }

  /*
   * Existing profile.
   *
   * Make sure all supported social platforms
   * are returned, even if they don't yet exist
   * inside MongoDB.
   */

  const existingSocials =
    profile.socialIcons || [];

  const socialMap = new Map(
    existingSocials.map((item) => [
      item.platform,
      item,
    ])
  );

  const normalizedSocialIcons =
    SOCIAL_PLATFORMS.map(
      (platform) => {
        const existing =
          socialMap.get(platform);

        if (existing) {
          return {
            id: existing._id.toString(),

            platform,

            url: existing.url || "",

            enabled:
              Boolean(existing.enabled) &&
              Boolean(
                String(
                  existing.url || ""
                ).trim()
              ),
          };
        }

        return {
          id: null,

          platform,

          url: "",

          enabled: false,
        };
      }
    );

  return {
    exists: true,

    ...toPlainProfile(profile),

    socialIcons:
      normalizedSocialIcons,
  };
}

/* =========================================================
   PUBLIC PROFILE READ
========================================================= */

export async function getPublicProfile(
  username
) {
  if (!username) {
    throw createAppError(
      "Profile not found.",
      404
    );
  }

  const normalized = String(username)
    .trim()
    .toLowerCase();

  const profile =
    await findProfileByUsername(
      normalized
    );

  if (!profile) {
    throw createAppError(
      "Profile not found.",
      404
    );
  }

  return toPlainProfile(profile, {
    publicOnly: true,
  });
}

/* =========================================================
   USERNAME AVAILABILITY
========================================================= */

export async function checkUsernameAvailability(
  username,
  currentUserId
) {
  const normalized =
    validateUsername(username);

  const exists =
    await checkUsernameExists(
      normalized,
      currentUserId
    );

  return {
    username: normalized,

    available: !exists,
  };
}

/* =========================================================
   SAVE PROFILE
========================================================= */

export async function saveProfile(
  userId,
  data
) {
  if (!userId) {
    throw createAppError(
      "User authentication is required.",
      401
    );
  }

  if (!data || typeof data !== "object") {
    throw createAppError(
      "Invalid profile data.",
      400
    );
  }

  /*
   * Username
   */

  const username =
    validateUsername(
      data.username
    );

  /*
   * Username uniqueness check.
   *
   * Current user's own profile is excluded.
   */

  const usernameTaken =
    await checkUsernameExists(
      username,
      userId
    );

  if (usernameTaken) {
    throw createAppError(
      "This username is already taken.",
      409
    );
  }

  /*
   * Complete database payload.
   */

  const payload = {
    userId,

    publicUsername: username,

    displayName:
      validateDisplayName(
        data.displayName
      ),

    bio:
      validateBio(
        data.bio
      ),

    profileImage:
      validateProfileImage(
        data.profileImage
      ),

    categoryTags:
      validateCategoryTags(
        data.categoryTags
      ),

    primaryButtons:
      validatePrimaryButtons(
        data.primaryButtons
      ),

    links:
      validateLinks(
        data.links
      ),

    socialIcons:
      validateSocialIcons(
        data.socialIcons
      ),

    theme: {
      accentColor:
        validateAccentColor(
          data.theme?.accentColor
        ),
    },
  };

  /*
   * Check whether profile already exists.
   */

  const existingProfile =
    await findProfileByUserId(
      userId
    );

  let profile;

  if (existingProfile) {
    /*
     * UPDATE
     */

    profile =
      await updateProfile(
        userId,
        payload
      );
  } else {
    /*
     * CREATE
     */

    profile =
      await createProfile(
        payload
      );
  }

  if (!profile) {
    throw createAppError(
      "Unable to save profile.",
      500
    );
  }

  /*
   * Return the same shape that the
   * dashboard expects.
   */

  return {
    exists: true,

    ...toPlainProfile(profile),
  };
}