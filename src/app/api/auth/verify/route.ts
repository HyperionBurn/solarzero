import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/email/verify";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/login?error=missing_token", req.nextUrl)
    );
  }

  try {
    const email = await verifyEmailToken(token);

    if (!email) {
      return NextResponse.redirect(
        new URL("/login?error=invalid_token", req.nextUrl)
      );
    }

    // Redirect to login with success message
    return NextResponse.redirect(
      new URL("/login?verified=true", req.nextUrl)
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(
      new URL("/login?error=verification_failed", req.nextUrl)
    );
  }
}
