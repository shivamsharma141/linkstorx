import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { verifyToken } from "@/app/lib/auth/jwt";
import { findUserById } from "@/app/databaseQueries/userDatabaseQueries";

const AUTH_COOKIE_NAME = "linkstorx_token";

export async function getCurrentUser() {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    AUTH_COOKIE_NAME
  )?.value;

  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);

  if (!decoded || !decoded.userId) {
    return null;
  }

  const user = await findUserById(
    decoded.userId
  );

  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
  };
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export const AUTH_COOKIE =
  AUTH_COOKIE_NAME;