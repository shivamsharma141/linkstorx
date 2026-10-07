import { NextResponse } from "next/server";

import { getCurrentUser } from "@/app/lib/auth/auth";

import {
  getProfileForDashboard,
  saveProfile,
  checkUsernameAvailability,
} from "@/app/businessLogic/profileBusinessLogic";

/* ---------------- ERROR ---------------- */

function handleProfileError(error) {
  const statusCode = error.statusCode || 500;

  const message =
    statusCode === 500
      ? "Something went wrong. Please try again."
      : error.message;

  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status: statusCode,
    }
  );
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      message: "Not authenticated.",
    },
    {
      status: 401,
    }
  );
}

/* ---------------- GET (DASHBOARD) ---------------- */

export async function getProfileController(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const profile = await getProfileForDashboard(
      user.id,
      user.username
    );

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    return handleProfileError(error);
  }
}

/* ---------------- UPDATE ---------------- */

export async function updateProfileController(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();

    const profile = await saveProfile(user.id, body);

    return NextResponse.json({
      success: true,
      message: "Profile saved.",
      profile,
    });
  } catch (error) {
    return handleProfileError(error);
  }
}

/* ---------------- USERNAME AVAILABILITY ---------------- */

export async function checkUsernameController(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);

    const username = searchParams.get("username");

    const result = await checkUsernameAvailability(
      username,
      user.id
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleProfileError(error);
  }
}
