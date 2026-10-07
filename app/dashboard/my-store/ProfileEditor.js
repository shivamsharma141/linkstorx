"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

const SOCIAL_META = {
  instagram: { label: "Instagram", color: "#D62976" },
  youtube: { label: "YouTube", color: "#FF0000" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  whatsapp: { label: "WhatsApp", color: "#25D366" },
  x: { label: "X", color: "#000000" },
  facebook: { label: "Facebook", color: "#1877F2" },
  telegram: { label: "Telegram", color: "#229ED9" },
  website: { label: "Website", color: "#5c5245" },
};

const SOCIAL_PATHS = {
  youtube:
    "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",

  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",

  whatsapp:
    "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.272-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",

  x:
    "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",

  facebook:
    "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",

  telegram:
    "M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
};

function SocialIcon({ platform, size = 18 }) {
  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size}>
        <defs>
          <linearGradient id="pe-ig" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#FEDA75" />
            <stop offset="35%" stopColor="#FA7E1E" />
            <stop offset="60%" stopColor="#D62976" />
            <stop offset="85%" stopColor="#962FBF" />
            <stop offset="100%" stopColor="#4F5BD5" />
          </linearGradient>
        </defs>
        <rect
          x="2.6"
          y="2.6"
          width="18.8"
          height="18.8"
          rx="5.4"
          fill="none"
          stroke="url(#pe-ig)"
          strokeWidth="2.1"
        />
        <circle
          cx="12"
          cy="12"
          r="4.4"
          fill="none"
          stroke="url(#pe-ig)"
          strokeWidth="2.1"
        />
        <circle cx="17.1" cy="6.9" r="1.35" fill="url(#pe-ig)" />
      </svg>
    );
  }

  if (platform === "website") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.5 2.6 3.9 5.7 3.9 9s-1.4 6.4-3.9 9c-2.5-2.6-3.9-5.7-3.9-9S9.5 5.6 12 3z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d={SOCIAL_PATHS[platform]} />
    </svg>
  );
}

function createId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function withDefaultSocialIcons(existing) {
  const map = new Map(existing.map((icon) => [icon.platform, icon]));

  return SOCIAL_PLATFORMS.map(
    (platform) =>
      map.get(platform) || {
        id: createId(),
        platform,
        url: "",
        enabled: false,
      }
  );
}

function reorder(items, index, direction) {
  const targetIndex = index + direction;

  if (targetIndex < 0 || targetIndex >= items.length) {
    return items;
  }

  const next = [...items];

  [next[index], next[targetIndex]] = [
    next[targetIndex],
    next[index],
  ];

  return next.map((item, i) => ({
    ...item,
    position: i,
  }));
}

function normalizeUrl(url) {
  const value = String(url || "").trim();

  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("whatsapp:")
  ) {
    return value;
  }

  return `https://${value}`;
}

const DEVICE_SIZES = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

export default function ProfileEditor({ initialProfile }) {
  const [profile, setProfile] = useState(() => ({
    username:
      initialProfile.username ||
      initialProfile.suggestedUsername ||
      "",

    displayName: initialProfile.displayName || "",
    bio: initialProfile.bio || "",
    profileImage: initialProfile.profileImage || "",
    categoryTags: initialProfile.categoryTags || [],
    primaryButtons: initialProfile.primaryButtons || [],
    links: initialProfile.links || [],
    socialIcons: withDefaultSocialIcons(
      initialProfile.socialIcons || []
    ),

    theme: {
      accentColor:
        initialProfile.theme?.accentColor || "#2563eb",
    },
  }));

  const [activeTab, setActiveTab] = useState("profile");
  const [previewMode, setPreviewMode] = useState("mobile");
  const [tagInput, setTagInput] = useState("");
  const [saveStatus, setSaveStatus] = useState(
    initialProfile.exists ? "saved" : "idle"
  );

  const [usernameStatus, setUsernameStatus] = useState(
    initialProfile.exists ? "available" : "idle"
  );

  const [usernameMessage, setUsernameMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy Link");
  const [baseUrl, setBaseUrl] = useState("");

  // Bumped after every successful save so the preview
  // <iframe> is forced to remount and reload the real
  // public page (an iframe won't refetch on its own if
  // the `src` string hasn't changed).
  const [previewKey, setPreviewKey] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(true);

  // Measures the preview column's actual width so we can
  // render the iframe at a REAL desktop/mobile viewport
  // width, then visually scale it to fit — this is what
  // keeps "Desktop" looking like desktop even when the
  // preview column itself is narrower than 700px.
  const previewFrameRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    const el = previewFrameRef.current;
    if (!el) return;

    const deviceWidth = DEVICE_SIZES[previewMode].width;

    function recalc() {
      const containerWidth = el.clientWidth;
      setPreviewScale(
        containerWidth > 0
          ? Math.min(containerWidth / deviceWidth, 1)
          : 1
      );
    }

    recalc();

    const observer = new ResizeObserver(recalc);
    observer.observe(el);

    return () => observer.disconnect();
  }, [previewMode]);

  const saveTimer = useRef(null);
  const usernameTimer = useRef(null);
  const isFirstRender = useRef(true);
  const lastCheckedUsername = useRef(
    initialProfile.username || initialProfile.suggestedUsername || ""
  );

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const publicUrl = useMemo(() => {
    const slug = profile.username || "your-username";
    return `${baseUrl}/${slug}`;
  }, [baseUrl, profile.username]);

  const canPreview =
    baseUrl &&
    profile.username &&
    usernameStatus !== "invalid" &&
    usernameStatus !== "taken";

  useEffect(() => {
    if (usernameTimer.current) {
      clearTimeout(usernameTimer.current);
    }

    const username = profile.username.trim().toLowerCase();

    if (!username) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }

    if (username.length < 3) {
      setUsernameStatus("invalid");
      setUsernameMessage(
        "Username must be at least 3 characters."
      );
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameStatus("invalid");
      setUsernameMessage(
        "Only letters, numbers and underscores allowed."
      );
      return;
    }

    if (username === lastCheckedUsername.current) {
      setUsernameStatus("available");
      setUsernameMessage("Username available");
      return;
    }

    setUsernameStatus("checking");

    usernameTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/profile/check-username?username=${encodeURIComponent(
            username
          )}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          setUsernameStatus("invalid");
          setUsernameMessage(
            data.message || "Could not check username."
          );
          return;
        }

        if (data.available) {
          setUsernameStatus("available");
          setUsernameMessage("Username available");
        } else {
          setUsernameStatus("taken");
          setUsernameMessage(
            "This username is already taken."
          );
        }
      } catch {
        setUsernameStatus("invalid");
        setUsernameMessage("Could not check username.");
      }
    }, 500);

    return () => clearTimeout(usernameTimer.current);
  }, [profile.username]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (
      !profile.username ||
      usernameStatus === "invalid" ||
      usernameStatus === "taken" ||
      usernameStatus === "checking"
    ) {
      return;
    }

    setSaveStatus("pending");

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");

      try {
        const payload = {
          ...profile,

          links: profile.links.map((link, index) => ({
            ...link,
            url: normalizeUrl(link.url),
            position: index,
          })),

          primaryButtons: profile.primaryButtons.map(
            (button, index) => ({
              ...button,
              url: normalizeUrl(button.url),
              position: index,
            })
          ),

          socialIcons: profile.socialIcons.map((social) => ({
            ...social,
            url: normalizeUrl(social.url),
          })),
        };

        const response = await fetch("/api/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setSaveStatus("error");
          return;
        }

        lastCheckedUsername.current = data.profile.username;
        setSaveStatus("saved");

        // The real public page just changed on the server —
        // force the preview iframe to reload so it always
        // matches what a visitor would actually see.
        setPreviewLoading(true);
        setPreviewKey((key) => key + 1);
      } catch {
        setSaveStatus("error");
      }
    }, 700);

    return () => clearTimeout(saveTimer.current);
  }, [profile, usernameStatus]);

  function updateField(field, value) {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function addTag() {
    const value = tagInput.trim();

    if (!value || profile.categoryTags.length >= 5) {
      return;
    }

    if (profile.categoryTags.includes(value)) {
      setTagInput("");
      return;
    }

    updateField("categoryTags", [
      ...profile.categoryTags,
      value,
    ]);

    setTagInput("");
  }

  function removeTag(tag) {
    updateField(
      "categoryTags",
      profile.categoryTags.filter((item) => item !== tag)
    );
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.message || "Upload failed.");
        return;
      }

      updateField("profileImage", data.url);
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function addButton() {
    updateField("primaryButtons", [
      ...profile.primaryButtons,
      {
        id: createId(),
        label: "New button",
        url: "",
        enabled: true,
        position: profile.primaryButtons.length,
      },
    ]);
  }

  function updateButton(id, patch) {
    updateField(
      "primaryButtons",
      profile.primaryButtons.map((button) =>
        button.id === id
          ? { ...button, ...patch }
          : button
      )
    );
  }

  function deleteButton(id) {
    updateField(
      "primaryButtons",
      profile.primaryButtons.filter(
        (button) => button.id !== id
      )
    );
  }

  function moveButton(index, direction) {
    updateField(
      "primaryButtons",
      reorder(
        profile.primaryButtons,
        index,
        direction
      )
    );
  }

  function addLink(platform = null) {
    const meta = platform
      ? SOCIAL_META[platform]
      : null;

    updateField("links", [
      ...profile.links,
      {
        id: createId(),
        title: meta ? meta.label : "New link",
        url: "",
        icon: platform || "",
        enabled: true,
        position: profile.links.length,
      },
    ]);
  }

  function addSocialAsLink(platform) {
    const social = profile.socialIcons.find(
      (item) => item.platform === platform
    );

    if (social?.url) {
      addLink(platform);
      return;
    }

    addLink(platform);
  }

  function updateLink(id, patch) {
    updateField(
      "links",
      profile.links.map((link) =>
        link.id === id
          ? { ...link, ...patch }
          : link
      )
    );
  }

  function deleteLink(id) {
    updateField(
      "links",
      profile.links.filter((link) => link.id !== id)
    );
  }

  function moveLink(index, direction) {
    updateField(
      "links",
      reorder(profile.links, index, direction)
    );
  }

  function updateSocialIcon(platform, patch) {
    updateField(
      "socialIcons",
      profile.socialIcons.map((icon) => {
        if (icon.platform !== platform) {
          return icon;
        }

        return {
          ...icon,
          ...patch,
          enabled:
            patch.url !== undefined
              ? Boolean(String(patch.url).trim())
                ? patch.enabled ?? icon.enabled
                : false
              : patch.enabled,
        };
      })
    );
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);

      setCopyLabel("✓ Link copied!");

      setTimeout(() => {
        setCopyLabel("Copy Link");
      }, 2000);
    } catch {
      setCopyLabel("Could not copy");

      setTimeout(() => {
        setCopyLabel("Copy Link");
      }, 2000);
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          url: publicUrl,
          title: profile.displayName || profile.username,
        });
      } catch {
        // cancelled
      }
    } else {
      handleCopyLink();
    }
  }

  const accent =
    profile.theme?.accentColor || "#2563eb";

  return (
    <div
      className="pe-wrapper"
      style={{ "--pe-accent": accent }}
    >
      <div className="pe-sharebar">
        <div>
          <p className="pe-sharebar-label">Your Link</p>
          <p className="pe-sharebar-url">
            {publicUrl}
          </p>
        </div>

        <div className="pe-sharebar-actions">
          <span
            className={`pe-save-status pe-save-${saveStatus}`}
          >
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "✓ Changes saved"}
            {saveStatus === "error" && "Save failed"}
            {saveStatus === "pending" && "Editing..."}
          </span>

          <button
            type="button"
            className="pe-btn pe-btn-outline"
            onClick={handleCopyLink}
          >
            {copyLabel}
          </button>

          <button
            type="button"
            className="pe-btn pe-btn-primary"
            onClick={handleShare}
          >
            Share Profile
          </button>
        </div>
      </div>

      <div className="pe-body">
        <div className="pe-editor">
          <h1 className="pe-title">
            Edit Your Profile
          </h1>

          <p className="pe-subtitle">
            Customize your profile, links and appearance.
            Changes are saved automatically.
          </p>

          <div className="pe-tabs">
            {[
              { key: "profile", label: "Profile" },
              { key: "links", label: "Links" },
              { key: "social", label: "Social Icons" },
              {
                key: "appearance",
                label: "Appearance",
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={
                  activeTab === tab.key
                    ? "pe-tab pe-tab-active"
                    : "pe-tab"
                }
                onClick={() =>
                  setActiveTab(tab.key)
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "profile" && (
            <div className="pe-panel">
              <section className="pe-section">
                <h2 className="pe-section-title">
                  Profile Information
                </h2>

                <p className="pe-section-hint">
                  These details will be visible on your
                  LinkStorx page.
                </p>

                <div className="pe-photo-row">
                  <div className="pe-photo-preview">
                    {profile.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt="Profile"
                      />
                    ) : (
                      <div className="pe-photo-placeholder">
                        No photo
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="pe-btn pe-btn-outline pe-upload-btn">
                      {uploading
                        ? "Uploading..."
                        : "Change Photo"}

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        disabled={uploading}
                        hidden
                      />
                    </label>

                    <p className="pe-hint">
                      Recommended size: 800 x 1000
                      (JPG, PNG)
                    </p>
                  </div>
                </div>

                <label className="pe-field">
                  <span className="pe-label">
                    Display Name
                  </span>

                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) =>
                      updateField(
                        "displayName",
                        e.target.value
                      )
                    }
                    maxLength={60}
                  />
                </label>

                <label className="pe-field">
                  <span className="pe-label">
                    Username (URL)
                  </span>

                  <div className="pe-username-row">
                    <span className="pe-username-prefix">
                      {baseUrl.replace(
                        /^https?:\/\//,
                        ""
                      )}
                      /
                    </span>

                    <input
                      type="text"
                      value={profile.username}
                      onChange={(e) =>
                        updateField(
                          "username",
                          e.target.value
                            .toLowerCase()
                            .replace(/\s+/g, "")
                        )
                      }
                    />
                  </div>

                  {usernameMessage && (
                    <span
                      className={`pe-username-status pe-status-${usernameStatus}`}
                    >
                      {usernameStatus ===
                      "checking"
                        ? "Checking..."
                        : usernameMessage}
                    </span>
                  )}
                </label>

                <label className="pe-field">
                  <span className="pe-label">
                    Bio
                  </span>

                  <textarea
                    value={profile.bio}
                    onChange={(e) =>
                      updateField(
                        "bio",
                        e.target.value
                      )
                    }
                    maxLength={300}
                    rows={4}
                  />

                  <span className="pe-char-count">
                    {profile.bio.length}/300
                  </span>
                </label>
              </section>

              <section className="pe-section">
                <h2 className="pe-section-title">
                  Category Tags
                </h2>

                <p className="pe-section-hint">
                  Add tags to highlight what you do.
                </p>

                <div className="pe-tags">
                  {profile.categoryTags.map((tag) => (
                    <span
                      key={tag}
                      className="pe-tag"
                    >
                      {tag}

                      <button
                        type="button"
                        onClick={() =>
                          removeTag(tag)
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}

                  {profile.categoryTags.length <
                    5 && (
                    <input
                      className="pe-tag-input"
                      value={tagInput}
                      placeholder="Add Tag"
                      onChange={(e) =>
                        setTagInput(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      onBlur={addTag}
                    />
                  )}
                </div>
              </section>

              <section className="pe-section">
                <h2 className="pe-section-title">
                  Primary Buttons
                </h2>

                <p className="pe-section-hint">
                  These buttons appear prominently below
                  your name.
                </p>

                {profile.primaryButtons.map(
                  (button, index) => (
                    <div
                      key={button.id}
                      className="pe-row pe-button-editor-row"
                    >
                      <input
                        className="pe-row-input"
                        value={button.label}
                        onChange={(e) =>
                          updateButton(
                            button.id,
                            {
                              label:
                                e.target.value,
                            }
                          )
                        }
                        placeholder="Button label"
                      />

                      <input
                        className="pe-row-input"
                        value={button.url}
                        onChange={(e) =>
                          updateButton(
                            button.id,
                            {
                              url: e.target.value,
                            }
                          )
                        }
                        placeholder="https://"
                      />

                      <button
                        type="button"
                        className="pe-icon-btn"
                        onClick={() =>
                          moveButton(
                            index,
                            -1
                          )
                        }
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        className="pe-icon-btn"
                        onClick={() =>
                          moveButton(index, 1)
                        }
                      >
                        ↓
                      </button>

                      <label className="pe-toggle">
                        <input
                          type="checkbox"
                          checked={
                            button.enabled
                          }
                          onChange={(e) =>
                            updateButton(
                              button.id,
                              {
                                enabled:
                                  e.target
                                    .checked,
                              }
                            )
                          }
                        />

                        <span className="pe-toggle-slider" />
                      </label>

                      <button
                        type="button"
                        className="pe-icon-btn pe-icon-btn-danger"
                        onClick={() =>
                          deleteButton(
                            button.id
                          )
                        }
                      >
                        🗑
                      </button>
                    </div>
                  )
                )}

                <button
                  type="button"
                  className="pe-btn pe-btn-outline"
                  onClick={addButton}
                >
                  + Add Button
                </button>
              </section>
            </div>
          )}

          {activeTab === "links" && (
            <div className="pe-panel">
              <section className="pe-section">
                <h2 className="pe-section-title">
                  Links
                </h2>

                <p className="pe-section-hint">
                  Add any link or quickly add your social
                  profiles.
                </p>

                <div className="pe-social-quick-add">
                  {SOCIAL_PLATFORMS.map(
                    (platform) => (
                      <button
                        key={platform}
                        type="button"
                        className="pe-social-quick-btn"
                        onClick={() =>
                          addSocialAsLink(
                            platform
                          )
                        }
                      >
                        <span
                          style={{
                            color:
                              SOCIAL_META[
                                platform
                              ].color,
                          }}
                        >
                          <SocialIcon
                            platform={
                              platform
                            }
                            size={16}
                          />
                        </span>

                        {
                          SOCIAL_META[
                            platform
                          ].label
                        }
                      </button>
                    )
                  )}
                </div>

                <div className="pe-links-list">
                  {profile.links.map(
                    (link, index) => (
                      <div
                        key={link.id}
                        className="pe-link-editor-card"
                      >
                        <div className="pe-link-icon-input">
                          <input
                            className="pe-row-input"
                            value={
                              link.icon
                            }
                            onChange={(e) =>
                              updateLink(
                                link.id,
                                {
                                  icon: e
                                    .target
                                    .value,
                                }
                              )
                            }
                            placeholder="🔗"
                          />
                        </div>

                        <div className="pe-link-fields">
                          <input
                            className="pe-row-input"
                            value={
                              link.title
                            }
                            onChange={(e) =>
                              updateLink(
                                link.id,
                                {
                                  title:
                                    e.target
                                      .value,
                                }
                              )
                            }
                            placeholder="Title"
                          />

                          <input
                            className="pe-row-input"
                            value={
                              link.url
                            }
                            onChange={(e) =>
                              updateLink(
                                link.id,
                                {
                                  url: e.target
                                    .value,
                                }
                              )
                            }
                            placeholder="https://"
                          />
                        </div>

                        <div className="pe-link-actions">
                          <button
                            type="button"
                            className="pe-icon-btn"
                            onClick={() =>
                              moveLink(
                                index,
                                -1
                              )
                            }
                          >
                            ↑
                          </button>

                          <button
                            type="button"
                            className="pe-icon-btn"
                            onClick={() =>
                              moveLink(
                                index,
                                1
                              )
                            }
                          >
                            ↓
                          </button>

                          <label className="pe-toggle">
                            <input
                              type="checkbox"
                              checked={
                                link.enabled
                              }
                              onChange={(e) =>
                                updateLink(
                                  link.id,
                                  {
                                    enabled:
                                      e.target
                                        .checked,
                                  }
                                )
                              }
                            />

                            <span className="pe-toggle-slider" />
                          </label>

                          <button
                            type="button"
                            className="pe-icon-btn pe-icon-btn-danger"
                            onClick={() =>
                              deleteLink(
                                link.id
                              )
                            }
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <button
                  type="button"
                  className="pe-btn pe-btn-outline"
                  onClick={() => addLink()}
                >
                  + Add Link
                </button>
              </section>
            </div>
          )}

          {activeTab === "social" && (
            <div className="pe-panel">
              <section className="pe-section">
                <h2 className="pe-section-title">
                  Social Icons
                </h2>

                <p className="pe-section-hint">
                  Add a profile URL to show the social
                  icon on your public page.
                </p>

                {profile.socialIcons.map(
                  (icon) => {
                    const meta =
                      SOCIAL_META[
                        icon.platform
                      ];

                    const hasUrl =
                      icon.url.trim() !== "";

                    return (
                      <div
                        key={icon.platform}
                        className="pe-social-editor"
                      >
                        <span
                          className="pe-social-badge"
                          style={{
                            color: meta.color,
                          }}
                        >
                          <SocialIcon
                            platform={
                              icon.platform
                            }
                          />
                        </span>

                        <span className="pe-social-label">
                          {meta.label}
                        </span>

                        <input
                          className="pe-row-input"
                          value={icon.url}
                          onChange={(e) =>
                            updateSocialIcon(
                              icon.platform,
                              {
                                url: e
                                  .target
                                  .value,
                                enabled:
                                  true,
                              }
                            )
                          }
                          placeholder="https://"
                        />

                        {hasUrl ? (
                          <label className="pe-toggle">
                            <input
                              type="checkbox"
                              checked={
                                icon.enabled
                              }
                              onChange={(e) =>
                                updateSocialIcon(
                                  icon.platform,
                                  {
                                    enabled:
                                      e
                                        .target
                                        .checked,
                                  }
                                )
                              }
                            />

                            <span className="pe-toggle-slider" />
                          </label>
                        ) : (
                          <span className="pe-social-hint">
                            Hidden
                          </span>
                        )}
                      </div>
                    );
                  }
                )}
              </section>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="pe-panel">
              <section className="pe-section">
                <h2 className="pe-section-title">
                  Appearance
                </h2>

                <p className="pe-section-hint">
                  Pick the main color for your public
                  profile buttons and active elements.
                </p>

                <div className="pe-color-editor">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) =>
                      updateField("theme", {
                        accentColor:
                          e.target.value,
                      })
                    }
                  />

                  <input
                    className="pe-row-input"
                    value={accent}
                    onChange={(e) =>
                      updateField("theme", {
                        accentColor:
                          e.target.value,
                      })
                    }
                  />

                  <span
                    className="pe-color-preview"
                    style={{
                      background: accent,
                    }}
                  />
                </div>
              </section>
            </div>
          )}
        </div>

        {/* LIVE PREVIEW — a real iframe of the actual
            public page. This guarantees the preview is
            pixel-identical to what visitors see, and
            every link, button and tab is genuinely
            clickable because it IS the live page. */}

        <div className="pe-preview">
          <div className="pe-preview-header">
            <h2 className="pe-section-title">
              Live Preview
            </h2>

            <div className="pe-preview-toggle">
              <button
                type="button"
                className={
                  previewMode === "desktop"
                    ? "pe-tab pe-tab-active"
                    : "pe-tab"
                }
                onClick={() =>
                  setPreviewMode("desktop")
                }
              >
                Desktop
              </button>

              <button
                type="button"
                className={
                  previewMode === "mobile"
                    ? "pe-tab pe-tab-active"
                    : "pe-tab"
                }
                onClick={() =>
                  setPreviewMode("mobile")
                }
              >
                Mobile
              </button>
            </div>
          </div>

          <div
            className="pe-preview-frame-outer"
            ref={previewFrameRef}
          >
            <div
              className={`pe-preview-frame pe-preview-${previewMode}`}
              style={{
                width:
                  DEVICE_SIZES[previewMode].width *
                  previewScale,
                height:
                  DEVICE_SIZES[previewMode].height *
                  previewScale,
              }}
            >
              {canPreview ? (
                <>
                  {previewLoading && (
                    <div className="pe-preview-loading">
                      Loading preview…
                    </div>
                  )}

                  <div
                    className="pe-preview-scale"
                    style={{
                      width:
                        DEVICE_SIZES[previewMode].width,
                      height:
                        DEVICE_SIZES[previewMode]
                          .height,
                      transform: `scale(${previewScale})`,
                    }}
                  >
                    <iframe
                      key={previewKey}
                      src={publicUrl}
                      title="Live profile preview"
                      className="pe-preview-iframe"
                      style={{
                        width:
                          DEVICE_SIZES[previewMode]
                            .width,
                        height:
                          DEVICE_SIZES[previewMode]
                            .height,
                      }}
                      onLoad={(e) => {
                        setPreviewLoading(false);

                        // Hide the iframe's own native
                        // scrollbar so the preview reads
                        // like a real phone/browser
                        // screen instead of a cramped
                        // widget with a visible scrollbar.
                        // Scrolling itself still works —
                        // only the visual bar is hidden.
                        // Wrapped in try/catch since this
                        // only works for same-origin pages.
                        try {
                          const doc =
                            e.target.contentDocument;

                          if (
                            doc &&
                            !doc.getElementById(
                              "pe-hide-scrollbar"
                            )
                          ) {
                            const style =
                              doc.createElement(
                                "style"
                              );

                            style.id =
                              "pe-hide-scrollbar";

                            style.textContent = `
                              html {
                                scrollbar-width: none;
                              }
                              ::-webkit-scrollbar {
                                width: 0px;
                                height: 0px;
                              }
                            `;

                            doc.head.appendChild(
                              style
                            );
                          }
                        } catch {
                          // cross-origin — ignore
                        }
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="pe-public-empty pe-preview-placeholder">
                  Choose a valid username to see your
                  live preview.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}