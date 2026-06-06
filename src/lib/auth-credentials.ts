import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { normalizeEmailAddress } from "@/lib/email/address";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export async function authorizeCredentials(
  emailInput: string,
  password: string,
): Promise<AuthenticatedUser | null> {
  const email = normalizeEmailAddress(emailInput);

  const user = await db.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
  });

  if (!user?.emailVerified) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
