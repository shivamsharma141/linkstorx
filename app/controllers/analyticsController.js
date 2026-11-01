import { NextResponse } from "next/server";

import { getCurrentUser } from "@/app/lib/auth/auth";

import { trackEvent, getAnalytics } from "@/app/businessLogic/analyticsBusinessLogic";

function errorResponse(error) {
  const statusCode = error.statusCode || 500;

  if (statusCode === 500) {
    console.error("ANALYTICS ERROR:", error.message);
  }

  return NextResponse.json(
    {
      success: false,
      message:
        statusCode === 500 ? "Something went wrong. Please try again." : error.message,
    },
    { status: statusCode }
  );
}

/* POST /api/analytics/track  (public, login nahi chahiye) */
export async function trackAnalyticsController(request) {
  try {
    let body = null;

    try {
      body = await request.json();
    } catch {
      body = null;
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "Invalid request." }, { status: 400 });
    }

    /* Owner pehchanne ke liye (login cookie se). Fail ho toh visitor maan lo. */
    let viewerUserId = null;

    try {
      const user = await getCurrentUser();
      viewerUserId = user?.id || null;
    } catch {
      viewerUserId = null;
    }

    const headers = request.headers;

    await trackEvent(body, {
      viewerUserId,
      userAgent: headers.get("user-agent") || "",
      host: headers.get("host") || "",
      /* Vercel / Cloudflare country header. VPS par ye khali rahega. */
      country: headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry") || "",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}

/* GET /api/analytics?range=7d  (sirf owner) */
export async function getAnalyticsController(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const data = await getAnalytics(user.id, searchParams.get("range"));

    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    return errorResponse(error);
  }
}
