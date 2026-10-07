import { NextResponse } from "next/server";

import {
  registerUser,
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

/* ---------------- REGISTER ---------------- */

export async function registerController(request) {
  try {
    const body = await request.json();

    const { user, token } =
      await registerUser(body);

    const response = NextResponse.json(
      {
        success: true,
        message: "Account created successfully.",
        user,
      },
      {
        status: 201,
      }
    );

    setAuthCookie(response, token);

    return response;
  } catch (error) {
    return handleAuthError(error);
  }
}

/* ---------------- LOGIN ---------------- */

export async function loginController(request) {
  try {
    const body = await request.json();

    const { user, token } =
      await loginUser(body);

    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful.",
        user,
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
    const body = await request.json();

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
    const body = await request.json();

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
    const body = await request.json();

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