import { NextResponse } from "next/server";

import { requireAuth } from "@/app/lib/auth/auth";
import {
  submitInquiry,
  getInbox,
  setInquiryStatus,
  removeInquiry,
} from "@/app/businessLogic/inquiryBusinessLogic";

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

/* =========================================================
   INBOX: /api/inbox (GET list, PATCH status, DELETE)
   Login zaroori. Seller ka id session se aata hai, frontend se nahi.
========================================================= */

async function handle(fn) {
  try {
    const data = await fn();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    /* requireAuth redirect throw kare to usse 401 treat karo */
    const isRedirect = String(error?.digest || "").startsWith("NEXT_REDIRECT");
    const statusCode = error.statusCode || (isRedirect ? 401 : 500);

    if (statusCode === 500) {
      console.error("INBOX ERROR:", error.message);
    }

    return NextResponse.json(
      {
        success: false,
        message:
          statusCode === 500
            ? "Something went wrong. Please try again."
            : error.message || "Unauthorized",
      },
      { status: statusCode }
    );
  }
}

export function getInboxController() {
  return handle(async () => {
    const user = await requireAuth();
    return getInbox(user.id);
  });
}

export function updateInboxController(request) {
  return handle(async () => {
    const user = await requireAuth();

    let body = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    if (!body || typeof body !== "object") {
      const error = new Error("Invalid request.");
      error.statusCode = 400;
      throw error;
    }

    await setInquiryStatus(user.id, body.id, body.status);
    return {};
  });
}

export function deleteInboxController(request) {
  return handle(async () => {
    const user = await requireAuth();
    const id = new URL(request.url).searchParams.get("id");

    await removeInquiry(user.id, id);
    return {};
  });
}