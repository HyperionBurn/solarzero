"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { generateVerificationToken, getVerificationUrl } from "@/lib/email/verify";
import { sendVerificationEmail } from "@/lib/email/send";
import { logger } from "@/lib/logger";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export async function loginAction(_prevState: unknown, formData: FormData) {
  try {
    const validated = loginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    // Auth handled client-side by LoginPage via signIn from next-auth/react
    return { error: null, success: true, email: validated.email };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message };
    logger.error({ err: error }, "Login action error");
    return { error: "Invalid email or password" };
  }
}

export async function registerAction(_prevState: unknown, formData: FormData) {
  try {
    const validated = registerSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });
    const existingUser = await db.user.findUnique({ where: { email: validated.email } });
    if (existingUser) return { error: "Email already registered" };
    const hashedPassword = await bcrypt.hash(validated.password, 12);
    await db.user.create({
      data: { name: validated.name, email: validated.email, passwordHash: hashedPassword },
    });
    // Send verification email (best-effort — don't fail registration if it errors)
    try {
      const token = await generateVerificationToken(validated.email);
      const verificationUrl = getVerificationUrl(token);
      await sendVerificationEmail(validated.email, validated.name, verificationUrl);
    } catch (err) {
      logger.warn({ err }, "Failed to send verification email during registration");
    }
    // Auth auto-login handled client-side by RegisterPage via signIn from next-auth/react
    return { error: null, success: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues[0].message };
    logger.error({ err: error }, "Register action error");
    return { error: "Failed to create account" };
  }
}
