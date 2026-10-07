import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  return NextResponse.json(
    { authenticated: Boolean(user) },
    { headers: { "Cache-Control": "no-store" } }
  );
}