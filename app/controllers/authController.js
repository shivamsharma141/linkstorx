import { NextResponse } from "next/server";

import {
  registerUser,
  resendSignupCode,
  verifySignup,
  loginUser,
  sendPasswordReset,
  verifyPasswordResetCode,
  resetPassword,
} from "@/app/businessLogic/authBusinessLogic";

import { AUTH_COOKIE } from "@/app/lib/auth/auth";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/* ---------------- COOKIE ---------------- */

function setAuthCookie(response, token) {
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
}

/* ---------------- ERROR ---------------- */

function handleAuthError(error) {
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

/* ---------------- SAFE JSON BODY ---------------- */

// Galat / khali JSON par 500 ki jagah 400 milta hai
async function readJsonBody(request) {
  try {
    const body = await request.json();

    if (body && typeof body === "object") {
      return body;
    }
  } catch {}

  const error = new Error("Invalid request.");
  error.statusCode = 400;
  throw error;
}

/* ---------------- REGISTER / RESEND ---------------- */

export async function registerController(request) {
  try {
    const body = await readJsonBody(request);

    // Resend: isi route par { action: "resend", email }
    if (body.action === "resend") {
      const { email } = await resendSignupCode(body.email);

      return NextResponse.json(
        {
          success: true,
          needsVerification: true,
          message: "A new verification code has been sent.",
          email,
        },
        {
          status: 200,
        }
      );
    }

    // Sirf username, email, password pass hote hain. role kabhi nahi.
    const { email } = await registerUser({
      username: body.username,
      email: body.email,
      password: body.password,
    });

    // Cookie nahi, pehle email verify hoga
    return NextResponse.json(
      {
        success: true,
        needsVerification: true,
        message: "Verification code sent to your email.",
        email,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

/* ---------------- LOGIN ---------------- */

export async function loginController(request) {
  try {
    const body = await readJsonBody(request);

    // Sirf identifier aur password pass hote hain
    const { user, isAdmin, token } = await loginUser({
      identifier: body.identifier,
      password: body.password,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful.",
        user,
        // Server-side computed (DB role + ADMIN_EMAIL). Sirf redirect UX ke liye.
        isAdmin,
      },
      {
        status: 200,
      }
    );

    setAuthCookie(response, token);

    return response;
  } catch (error) {
    return handleAuthError(error);
  }
}

/* ---------------- LOGOUT ---------------- */

export function logoutController(request) {
  const response = NextResponse.redirect(
    new URL("/login", request.url)
  );

  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}

/* ================================================= */
/*              FORGOT PASSWORD                      */
/* ================================================= */

export async function forgotPasswordController(request) {
  try {
    const body = await readJsonBody(request);

    await sendPasswordReset(body.email);

    return NextResponse.json(
      {
        success: true,
        message:
          "If an account exists with this email, a verification code has been sent.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

/* ---------------- VERIFY CODE ---------------- */

export async function verifyCodeController(request) {
  try {
    const body = await readJsonBody(request);

    // Signup ka email verification
    if (body.purpose === "signup") {
      await verifySignup(body.email, body.code);

      return NextResponse.json(
        {
          success: true,
          message: "Email verified successfully.",
          email: String(body.email).trim().toLowerCase(),
        },
        {
          status: 200,
        }
      );
    }

    // Forgot password ka code
    await verifyPasswordResetCode(
      body.email,
      body.code
    );

    return NextResponse.json(
      {
        success: true,
        message: "Verification code is correct.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

/* ---------------- RESET PASSWORD ---------------- */

export async function resetPasswordController(request) {
  try {
    const body = await readJsonBody(request);

    await resetPassword(
      body.email,
      body.code,
      body.password
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Password changed successfully.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}