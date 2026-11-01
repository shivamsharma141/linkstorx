import { NextResponse } from "next/server";

import { submitInquiry } from "@/app/businessLogic/inquiryBusinessLogic";

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) return forwarded.split(",")[0].trim();

  return request.headers.get("x-real-ip") || "unknown";
}

/* POST /api/inquiry  (public, login nahi chahiye) */
export async function createInquiryController(request) {
  try {
    let body = null;

    try {
      body = await request.json();
    } catch {
      body = null;
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid request." },
        { status: 400 }
      );
    }

    await submitInquiry(body, getClientIp(request));

    return NextResponse.json({
      success: true,
      message: "Message sent.",
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode === 500) {
      console.error("INQUIRY ERROR:", error.message);
    }

    return NextResponse.json(
      {
        success: false,
        message:
          statusCode === 500
            ? "Something went wrong. Please try again."
            : error.message,
      },
      { status: statusCode }
    );
  }
}

