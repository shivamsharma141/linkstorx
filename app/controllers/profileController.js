import { NextResponse } from "next/server";

import { getCurrentUser } from "@/app/lib/auth/auth";

import {
  getProfileForDashboard,
  saveProfile,
  checkUsernameAvailability,
  publishProfile,
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

/* ---------------- PUBLISH ----------------
   POST /api/profile  body: { "action": "publish" }
   Unpublish system hata diya gaya hai: ek baar publish = hamesha live.
------------------------------------------------------- */

export async function publishProfileController(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedResponse();
    }

    let body = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    if (body?.action !== "publish") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid action.",
        },
        {
          status: 400,
        }
      );
    }

    const profile = await publishProfile(user.id);

    return NextResponse.json({
      success: true,
      message: "Your page is now live.",
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