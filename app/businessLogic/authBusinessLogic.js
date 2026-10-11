import crypto from "crypto";

import {
  hashPassword,
  comparePassword,
  hashCode,
  compareCode,
} from "@/app/lib/auth/password";

import { createToken } from "@/app/lib/auth/jwt";

import { isAdminAccount } from "@/app/lib/auth/auth";

import { sendResetCode } from "@/app/lib/email/mailer";

import {
  findUserByEmail,
  findUserByUsername,
  findUserByIdentifier,
  createUser,
  findPendingSignup,
  savePendingSignup,
  consumePendingAttempt,
  reissuePendingCode,
  deletePendingSignup,
  findUserForPasswordReset,
  saveResetCode,
  clearResetCode,
  updatePassword,
} from "@/app/databaseQueries/userDatabaseQueries";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RESET_CODE_TIME = 5 * 60 * 1000;

const SIGNUP_CODE_TIME = 15 * 60 * 1000;
const SIGNUP_RESEND_GAP = 60 * 1000;
const SIGNUP_MAX_ATTEMPTS = 5;

/* ---------------- ERROR ---------------- */

function createAppError(message, statusCode) {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
}

/* ---------------- SAFE USER ---------------- */

function toSafeUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
  };
}

/* ---------------- PENDING SNAPSHOT (restore ke liye) ---------------- */

function snapshotPending(pending) {
  return {
    email: pending.email,
    username: pending.username,
    passwordHash: pending.passwordHash,
    codeHash: pending.codeHash,
    attempts: pending.attempts,
    lastSentAt: pending.lastSentAt,
    expiresAt: pending.expiresAt,
  };
}

/* ---------------- EMAIL VALIDATION ---------------- */

function normalizeAndValidateEmail(email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (
    !EMAIL_PATTERN.test(normalizedEmail) ||
    normalizedEmail.length > 254
  ) {
    throw createAppError(
      "Enter a valid email address.",
      400
    );
  }

  return normalizedEmail;
}

/* ---------------- PASSWORD VALIDATION ---------------- */

function validatePassword(password) {
  if (!password) {
    throw createAppError("Password is required.", 400);
  }

  if (password.length < 8) {
    throw createAppError(
      "Password must be at least 8 characters.",
      400
    );
  }

  if (password.length > 128) {
    throw createAppError("Password is too long.", 400);
  }

  if (!/[A-Z]/.test(password)) {
    throw createAppError(
      "Password must contain an uppercase letter.",
      400
    );
  }

  if (!/[a-z]/.test(password)) {
    throw createAppError(
      "Password must contain a lowercase letter.",
      400
    );
  }

  if (!/[0-9]/.test(password)) {
    throw createAppError(
      "Password must contain a number.",
      400
    );
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    throw createAppError(
      "Password must contain a special character.",
      400
    );
  }
}

/* ---------------- REGISTER STEP 1: OTP bhejna (user NAHI banta) ---------------- */

export async function registerUser({
  username,
  email,
  password,
}) {
  if (!username || !email || !password) {
    throw createAppError(
      "Username, email and password are required.",
      400
    );
  }

  const normalizedEmail = normalizeAndValidateEmail(email);

  const normalizedUsername = String(username)
    .trim()
    .toLowerCase();

  if (normalizedUsername.length < 3) {
    throw createAppError(
      "Username must be at least 3 characters.",
      400
    );
  }

  if (normalizedUsername.length > 30) {
    throw createAppError(
      "Username must be at most 30 characters.",
      400
    );
  }

  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    throw createAppError(
      "Username can only contain letters, numbers and underscores.",
      400
    );
  }

  validatePassword(String(password));

  const existingEmail = await findUserByEmail(normalizedEmail);

  if (existingEmail) {
    throw createAppError(
      "Email or username already exists.",
      409
    );
  }

  const existingUsername = await findUserByUsername(
    normalizedUsername
  );

  if (existingUsername) {
    throw createAppError(
      "Email or username already exists.",
      409
    );
  }

  // Same email pe 60 sec se pehle dobara OTP nahi (spam/abuse rokne ke liye)
  const pending = await findPendingSignup(normalizedEmail);

  if (
    pending &&
    Date.now() - new Date(pending.lastSentAt).getTime() <
      SIGNUP_RESEND_GAP
  ) {
    throw createAppError(
      "Please wait a minute before requesting another code.",
      429
    );
  }

  // Email fail ho to pehle wali pending state wapas laane ke liye
  const previousPending = pending ? snapshotPending(pending) : null;

  const code = crypto.randomInt(100000, 1000000).toString();

  // Abhi sirf pending mein save hota hai, users collection mein NAHI
  await savePendingSignup({
    email: normalizedEmail,
    username: normalizedUsername,
    passwordHash: await hashPassword(String(password)),
    codeHash: await hashCode(code),
    attempts: 0,
    lastSentAt: new Date(),
    expiresAt: new Date(Date.now() + SIGNUP_CODE_TIME),
  });

  try {
    await sendResetCode(normalizedEmail, code, "signup");
  } catch {
    if (previousPending) {
      await savePendingSignup(previousPending);
    } else {
      await deletePendingSignup(normalizedEmail);
    }

    throw createAppError(
      "Could not send verification email. Check the address and try again.",
      502
    );
  }

  return { email: normalizedEmail };
}

/* ---------------- RESEND SIGNUP OTP ---------------- */

export async function resendSignupCode(email) {
  if (!email) {
    throw createAppError("Email is required.", 400);
  }

  const normalizedEmail = normalizeAndValidateEmail(email);

  const pending = await findPendingSignup(normalizedEmail);

  if (!pending) {
    throw createAppError(
      "Signup session expired. Please sign up again.",
      404
    );
  }

  // Agar is beech email register ho chuka hai to pending bekaar hai
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    await deletePendingSignup(normalizedEmail);

    throw createAppError(
      "Email or username already exists.",
      409
    );
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHash = await hashCode(code);

  const nowMs = Date.now();

  // Atomic: sirf tab update hota hai jab 60 sec cooldown poora ho chuka ho.
  // Naya hash purane code ko turant invalid kar deta hai, attempts 0 ho jate hain.
  const previous = await reissuePendingCode(
    normalizedEmail,
    {
      codeHash,
      attempts: 0,
      lastSentAt: new Date(nowMs),
      expiresAt: new Date(nowMs + SIGNUP_CODE_TIME),
    },
    new Date(nowMs - SIGNUP_RESEND_GAP)
  );

  if (!previous) {
    const current = await findPendingSignup(normalizedEmail);

    if (!current) {
      throw createAppError(
        "Signup session expired. Please sign up again.",
        404
      );
    }

    const waitSeconds = Math.max(
      1,
      Math.ceil(
        (SIGNUP_RESEND_GAP -
          (Date.now() -
            new Date(current.lastSentAt).getTime())) /
          1000
      )
    );

    throw createAppError(
      `Please wait ${waitSeconds} seconds before requesting another code.`,
      429
    );
  }

  try {
    await sendResetCode(normalizedEmail, code, "signup");
  } catch {
    // Email nahi gaya: purana code, attempts aur cooldown wapas
    await savePendingSignup(snapshotPending(previous));

    throw createAppError(
      "Could not send verification email. Please try again.",
      502
    );
  }

  return { email: normalizedEmail };
}

/* ---------------- REGISTER STEP 2: OTP sahi to hi user banta hai ---------------- */

export async function verifySignup(email, code) {
  if (!email || !code) {
    throw createAppError(
      "Email and verification code are required.",
      400
    );
  }

  if (!/^\d{6}$/.test(String(code))) {
    throw createAppError(
      "Enter the 6-digit verification code.",
      400
    );
  }

  const normalizedEmail = normalizeAndValidateEmail(email);

  const pending = await findPendingSignup(normalizedEmail);

  // App-level expiry check: MongoDB TTL delete me der kar sakta hai
  if (
    !pending ||
    new Date(pending.expiresAt).getTime() < Date.now()
  ) {
    throw createAppError(
      "Code expired. Please request a new code or sign up again.",
      400
    );
  }

  // Atomic attempt: parallel requests se 5 ki limit cross nahi hoti
  const attemptDoc = await consumePendingAttempt(
    normalizedEmail,
    SIGNUP_MAX_ATTEMPTS
  );

  if (!attemptDoc) {
    // Ya to limit khatam, ya isi beech expire ho gaya
    if (pending.attempts >= SIGNUP_MAX_ATTEMPTS) {
      await deletePendingSignup(normalizedEmail);

      throw createAppError(
        "Too many wrong attempts. Please sign up again.",
        429
      );
    }

    throw createAppError(
      "Code expired. Please request a new code or sign up again.",
      400
    );
  }

  const codeValid = await compareCode(
    String(code),
    attemptDoc.codeHash
  );

  if (!codeValid) {
    if (attemptDoc.attempts >= SIGNUP_MAX_ATTEMPTS) {
      await deletePendingSignup(normalizedEmail);

      throw createAppError(
        "Too many wrong attempts. Please sign up again.",
        429
      );
    }

    const left = SIGNUP_MAX_ATTEMPTS - attemptDoc.attempts;

    throw createAppError(
      `Invalid verification code. ${left} attempt${
        left === 1 ? "" : "s"
      } left.`,
      400
    );
  }

  try {
    // role yahan set nahi hota, default "user" hi milta hai
    await createUser({
      username: attemptDoc.username,
      email: attemptDoc.email,
      passwordHash: attemptDoc.passwordHash,
    });
  } catch (error) {
    if (error?.code === 11000) {
      await deletePendingSignup(normalizedEmail);

      throw createAppError(
        "Email or username already exists.",
        409
      );
    }

    // Koi aur error (jaise DB issue): pending delete nahi karte
    throw error;
  }

  await deletePendingSignup(normalizedEmail);

  return true;
}

/* ---------------- LOGIN ---------------- */

export async function loginUser({
  identifier,
  password,
}) {
  if (!identifier || !password) {
    throw createAppError(
      "Email/username and password are required.",
      400
    );
  }

  const normalizedIdentifier = String(identifier)
    .trim()
    .toLowerCase();

  const user = await findUserByIdentifier(
    normalizedIdentifier
  );

  if (!user) {
    throw createAppError(
      "Invalid credentials.",
      401
    );
  }

  const passwordValid = await comparePassword(
    password,
    user.passwordHash
  );

  if (!passwordValid) {
    throw createAppError(
      "Invalid credentials.",
      401
    );
  }

  const token = createToken(user);

  return {
    user: toSafeUser(user),
    // DB role + ADMIN_EMAIL dono server par check hote hain
    isAdmin: isAdminAccount(user),
    token,
  };
}

/* ================================================= */
/*              FORGOT PASSWORD SYSTEM               */
/* ================================================= */

/* ---------------- SEND CODE ---------------- */

export async function sendPasswordReset(email) {
  if (!email) {
    throw createAppError(
      "Email is required.",
      400
    );
  }

  const normalizedEmail = String(email)
    .trim()
    .toLowerCase();

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw createAppError(
      "Enter a valid email address.",
      400
    );
  }

  const user = await findUserForPasswordReset(
    normalizedEmail
  );

  /*
   * We intentionally don't reveal whether the
   * email exists or not.
   */

  if (!user) {
    return;
  }

  const code = crypto
    .randomInt(100000, 1000000)
    .toString();

  const codeHash = await hashCode(code);

  const expiresAt = new Date(
    Date.now() + RESET_CODE_TIME
  );

  await saveResetCode(
    user._id,
    codeHash,
    expiresAt
  );

  await sendResetCode(
    normalizedEmail,
    code,
    "reset"
  );
}

/* ---------------- VERIFY CODE ---------------- */

export async function verifyPasswordResetCode(
  email,
  code
) {
  if (!email || !code) {
    throw createAppError(
      "Email and verification code are required.",
      400
    );
  }

  const normalizedEmail = String(email)
    .trim()
    .toLowerCase();

  const user = await findUserForPasswordReset(
    normalizedEmail
  );

  if (!user) {
    throw createAppError(
      "Invalid or expired verification code.",
      400
    );
  }

  if (!user.resetCodeHash || !user.resetCodeExpiresAt) {
    throw createAppError(
      "Invalid or expired verification code.",
      400
    );
  }

  if (
    new Date(user.resetCodeExpiresAt).getTime() <
    Date.now()
  ) {
    await clearResetCode(user._id);

    throw createAppError(
      "Verification code has expired.",
      400
    );
  }

  const codeValid = await compareCode(
    String(code),
    user.resetCodeHash
  );

  if (!codeValid) {
    throw createAppError(
      "Invalid verification code.",
      400
    );
  }

  return true;
}

/* ---------------- RESET PASSWORD ---------------- */

export async function resetPassword(
  email,
  code,
  newPassword
) {
  if (!email || !code || !newPassword) {
    throw createAppError(
      "Email, verification code and new password are required.",
      400
    );
  }

  validatePassword(newPassword);

  const normalizedEmail = String(email)
    .trim()
    .toLowerCase();

  const user = await findUserForPasswordReset(
    normalizedEmail
  );

  if (!user) {
    throw createAppError(
      "Invalid or expired verification code.",
      400
    );
  }

  if (!user.resetCodeHash || !user.resetCodeExpiresAt) {
    throw createAppError(
      "Invalid or expired verification code.",
      400
    );
  }

  if (
    new Date(user.resetCodeExpiresAt).getTime() <
    Date.now()
  ) {
    await clearResetCode(user._id);

    throw createAppError(
      "Verification code has expired.",
      400
    );
  }

  const codeValid = await compareCode(
    String(code),
    user.resetCodeHash
  );

  if (!codeValid) {
    throw createAppError(
      "Invalid verification code.",
      400
    );
  }

  const passwordHash = await hashPassword(
    newPassword
  );

  await updatePassword(
    user._id,
    passwordHash
  );
}