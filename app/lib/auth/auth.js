import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { NextResponse } from "next/server";

import { verifyToken } from "@/app/lib/auth/jwt";
import { findUserById } from "@/app/databaseQueries/userDatabaseQueries";

const AUTH_COOKIE_NAME = "linkstorx_token";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

/*
 * Single source of truth for the admin policy.
 * BOTH must be true: DB role is exactly "admin" AND email matches ADMIN_EMAIL.
 * If ADMIN_EMAIL is unset/empty, nobody is admin (fails closed).
 */
export function isAdminAccount(user) {
  if (!user) return false;

  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  if (!adminEmail) return false;

  return user.role === "admin" && normalizeEmail(user.email) === adminEmail;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) return null;

  // Always re-read the account from the database; never trust JWT claims for role.
  const user = await findUserById(decoded.userId);
  if (!user) return null;

  const isAdmin = isAdminAccount(user);

  // An "admin" role without the allowlisted email is downgraded to "user",
  // so any leftover `user.role === "admin"` checks elsewhere stay safe.
  const role = user.role === "admin" && !isAdmin ? "user" : user.role || "user";

  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role,
    isAdmin,
  };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Admin pages / server actions: anyone else gets a 404 (route is not revealed)
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) notFound();
  return user;
}

/*
 * Same-origin check for state-changing requests (CSRF defence in depth;
 * the cookie is also SameSite=Lax).
 */
function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");

  return Boolean(host) && originHost === host;
}

/*
 * For admin API route handlers. Usage:
 *
 *   const { user, error } = await requireAdminApi(request);
 *   if (error) return error;
 *
 * 401 = not logged in
 * 403 = logged in but not the admin
 * 403 = state-changing request from a foreign/missing Origin
 */
export async function requireAdminApi(request) {
  const deny = (status, message) => ({
    error: NextResponse.json(
      { success: false, message },
      { status, headers: { "Cache-Control": "no-store" } }
    ),
  });

  const user = await getCurrentUser();

  if (!user) return deny(401, "Authentication required.");
  if (!user.isAdmin) return deny(403, "Forbidden.");

  const method = String(request?.method || "GET").toUpperCase();
  const safeMethod =
    method === "GET" || method === "HEAD" || method === "OPTIONS";

  if (!safeMethod && !isSameOrigin(request)) {
    return deny(403, "Forbidden.");
  }

  return { user };
}

export const AUTH_COOKIE = AUTH_COOKIE_NAME;