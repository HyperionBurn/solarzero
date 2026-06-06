import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { generateVerificationToken, getVerificationUrl } from "@/lib/email/verify";
import { sendVerificationEmail } from "@/lib/email/send";
import { registerRateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { normalizeEmailAddress } from "@/lib/email/address";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    let success = true;
    let remaining = 0;

    try {
      const rateLimit = await registerRateLimit.limit(ip);
      success = rateLimit.success;
      remaining = rateLimit.remaining;
    } catch (err) {
      logger.warn(
        { err, action: "auth.register.rate_limit" },
        "Registration rate limit unavailable, allowing request",
      );
    }

    if (!success) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again later. (${remaining} attempts remaining)` },
        { status: 429 }
      );
    }

    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmailAddress(email);

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const existing = await db.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: { name, email: normalizedEmail, passwordHash },
    });

    // Generate verification token and send email
    try {
      const token = await generateVerificationToken(normalizedEmail);
      const verificationUrl = getVerificationUrl(token);
      await sendVerificationEmail(normalizedEmail, name, verificationUrl);
    } catch (err) {
      // Do not fail registration if the mail provider has a transient issue.
      logger.warn(
        { err, action: "auth.register.send_verification" },
        "Failed to send verification email",
      );
    }

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        message: "Registration successful. Please check your email to verify your account.",
      },
      { status: 201 }
    );
  } catch (err) {
    logger.error({ err, action: "auth.register" }, "Registration failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
