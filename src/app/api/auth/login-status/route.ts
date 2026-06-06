import { NextRequest, NextResponse } from "next/server";
import { getCredentialAccountStatus } from "@/lib/auth-credentials";
import { getClientIp, loginRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  try {
    const rateLimit = await loginRateLimit.limit(ip);
    if (!rateLimit.success) {
      return NextResponse.json(
        { status: "rate_limited" },
        { status: 429 },
      );
    }
  } catch (err) {
    logger.warn(
      { err, action: "auth.login_status.rate_limit" },
      "Login-status rate limit unavailable, allowing request",
    );
  }

  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email : "";

    if (!email) {
      return NextResponse.json({ status: "continue" });
    }

    const accountStatus = await getCredentialAccountStatus(email);

    return NextResponse.json({
      status: accountStatus === "unverified" ? "unverified" : "continue",
    });
  } catch (err) {
    logger.error(
      { err, action: "auth.login_status.lookup" },
      "Login-status lookup failed",
    );
    return NextResponse.json({ status: "continue" }, { status: 200 });
  }
}
