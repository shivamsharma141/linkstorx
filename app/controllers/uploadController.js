import { NextResponse } from "next/server";

import { getCurrentUser } from "@/app/lib/auth/auth";

import { uploadProfileImage } from "@/app/businessLogic/uploadBusinessLogic";

function handleUploadError(error) {
  const statusCode = error.statusCode || 500;

  const message =
    statusCode === 500
      ? "Upload failed. Please try again."
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

export async function uploadImageController(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
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

    const formData = await request.formData();

    const file = formData.get("file");

    const secureUrl = await uploadProfileImage(file);

    return NextResponse.json({
      success: true,
      url: secureUrl,
    });
  } catch (error) {
    return handleUploadError(error);
  }
}
