import crypto from "crypto";

import {
  hashPassword,
  comparePassword,
  hashCode,
  compareCode,
} from "@/app/lib/auth/password";

import { createToken } from "@/app/lib/auth/jwt";

import { sendResetCode } from "@/app/lib/email/mailer";

import {
  findUserByEmail,
  findUserByUsername,
  findUserByIdentifier,
  createUser,
  findUserForPasswordReset,
  saveResetCode,
  clearResetCode,
  updatePassword,
} from "@/app/databaseQueries/userDatabaseQueries";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RESET_CODE_TIME = 5 * 60 * 1000;

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

/* ---------------- REGISTER ---------------- */

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

  const normalizedEmail = String(email)
    .trim()
    .toLowerCase();

  const normalizedUsername = String(username)
    .trim()
    .toLowerCase();

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw createAppError(
      "Enter a valid email address.",
      400
    );
  }

  if (normalizedUsername.length < 3) {
    throw createAppError(
      "Username must be at least 3 characters.",
      400
    );
  }

  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    throw createAppError(
      "Username can only contain letters, numbers and underscores.",
      400
    );
  }

  validatePassword(password);

  const existingEmail = await findUserByEmail(
    normalizedEmail
  );

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

  const passwordHash = await hashPassword(password);

  const user = await createUser({
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash,
  });

  const token = createToken(user);

  return {
    user: toSafeUser(user),
    token,
  };
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
    code
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