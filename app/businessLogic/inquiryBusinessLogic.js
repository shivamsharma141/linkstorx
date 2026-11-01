import crypto from "crypto";

import { findProfileByUsername } from "@/app/databaseQueries/profileDatabaseQueries";
import {
  createInquiry,
  findRecentInquiriesByIp,
} from "@/app/databaseQueries/inquiryDatabaseQueries";

/* =========================================================
   RATE LIMIT: ek IP se 15 minute me max 2 messages.
   Limit hit hone par jab tak purana message window se bahar
   na jaye, wait karna padega.
========================================================= */

const RATE_MAX = 2;
const RATE_WINDOW_MS = 15 * 60 * 1000;

const MAX_NAME = 80;
const MAX_CONTACT = 120;
const MAX_OFFERING = 80;
const MAX_MESSAGE = 1000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?\d{7,15}$/;

function createAppError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hashIp(ip) {
  return crypto
    .createHmac("sha256", process.env.INQUIRY_IP_SECRET || "linkstorx-inquiry")
    .update(String(ip || "unknown"))
    .digest("hex")
    .slice(0, 32);
}

function clean(value, max) {
  return String(value || "").trim().slice(0, max);
}

function detectContact(raw) {
  const value = clean(raw, MAX_CONTACT);

  if (EMAIL_PATTERN.test(value)) {
    return { contact: value.toLowerCase(), contactType: "email" };
  }

  const digits = value.replace(/[\s\-().]/g, "");

  if (PHONE_PATTERN.test(digits)) {
    return { contact: digits, contactType: "phone" };
  }

  throw createAppError("Enter a valid email or WhatsApp number.", 400);
}

async function enforceRateLimit(ipHash) {
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recent = await findRecentInquiriesByIp(ipHash, since, RATE_MAX);

  if (recent.length < RATE_MAX) return;

  /* Sabse purana counted message jab window se nikle, tab dobara allowed */
  const oldest = new Date(recent[RATE_MAX - 1].createdAt).getTime();
  const waitMs = oldest + RATE_WINDOW_MS - Date.now();
  const minutes = Math.max(1, Math.ceil(waitMs / 60000));

  throw createAppError(
    `You have sent too many messages. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    429
  );
}

/* =========================================================
   SUBMIT (public, no login)
========================================================= */

export async function submitInquiry(input, ip) {
  /* Honeypot: bots hidden field bharte hain. Chupchap success dikha do. */
  if (input?.website) {
    return { sent: true };
  }

  const name = clean(input?.name, MAX_NAME);

  if (name.length < 2) {
    throw createAppError("Please enter your name.", 400);
  }

  const { contact, contactType } = detectContact(input?.contact);

  const offering = clean(input?.offering, MAX_OFFERING);
  const message = clean(input?.message, MAX_MESSAGE);

  const username = String(input?.username || "").trim().toLowerCase();

  if (!username) {
    throw createAppError("Profile not found.", 404);
  }

  const profile = await findProfileByUsername(username);

  if (!profile || !profile.isPublished) {
    throw createAppError("Profile not found.", 404);
  }

  if (!profile.inquiry?.enabled) {
    throw createAppError("This page is not accepting messages.", 403);
  }

  const ipHash = hashIp(ip);

  await enforceRateLimit(ipHash);

  await createInquiry({
    sellerId: profile.userId,
    name,
    contact,
    contactType,
    offering,
    message,
    ipHash,
  });

  return { sent: true };
}