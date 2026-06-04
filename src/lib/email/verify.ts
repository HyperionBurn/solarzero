import crypto from "crypto";
import { db } from "@/lib/db";
import { cleanEnvValue } from "../env";

/**
 * Generate a verification token for email verification.
 * Returns the token string to include in the verification URL.
 */
export async function generateVerificationToken(
  email: string
): Promise<string> {
  // Delete any existing tokens for this email
  await db.verificationToken.deleteMany({
    where: { identifier: email },
  });

  // Generate a random token
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Store the token
  await db.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  return token;
}

/**
 * Verify a token for email verification.
 * Returns the email if valid, null otherwise.
 */
export async function verifyEmailToken(
  token: string
): Promise<string | null> {
  const verificationToken = await db.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken) {
    return null;
  }

  // Check if token has expired
  if (verificationToken.expires < new Date()) {
    await db.verificationToken.delete({
      where: { token },
    });
    return null;
  }

  // Mark the user's email as verified
  await db.user.update({
    where: { email: verificationToken.identifier },
    data: { emailVerified: new Date() },
  });

  // Delete the used token
  await db.verificationToken.delete({
    where: { token },
  });

  return verificationToken.identifier;
}

/**
 * Get the verification URL for a given token.
 */
export function getVerificationUrl(token: string): string {
  const baseUrl = cleanEnvValue(process.env.NEXT_PUBLIC_APP_URL) || "http://localhost:3000";
  return `${baseUrl}/api/auth/verify?token=${token}`;
}
