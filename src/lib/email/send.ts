import nodemailer from "nodemailer";
import { escapeHtml } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { cleanEnvValue } from "../env";

const defaultFrom = cleanEnvValue(process.env.EMAIL_FROM) || "SolarZero <noreply@solarzero.app>";

const transporter = nodemailer.createTransport({
  host: cleanEnvValue(process.env.SMTP_HOST) || "smtp.resend.com",
  port: Number(cleanEnvValue(process.env.SMTP_PORT) || 587),
  secure: cleanEnvValue(process.env.SMTP_SECURE) === "true",
  auth: {
    user: cleanEnvValue(process.env.SMTP_USER) || "resend",
    pass:
      cleanEnvValue(process.env.SMTP_PASSWORD) ||
      cleanEnvValue(process.env.RESEND_API_KEY) ||
      "",
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email using the configured SMTP provider.
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: options.from ?? defaultFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return true;
  } catch (error) {
    logger.error({ err: error }, "Failed to send email");
    return false;
  }
}

/**
 * Send a verification email with the given token.
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationUrl: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
      <div style="background: #f8fafc; border-radius: 8px; padding: 32px; border: 1px solid #e2e8f0;">
        <h1 style="color: #0d9488; margin: 0 0 16px 0; font-size: 24px;">Welcome to SolarZero</h1>
        <p style="color: #334155; margin: 0 0 16px 0;">Hi ${escapeHtml(name)},</p>
        <p style="color: #334155; margin: 0 0 24px 0;">
          Thank you for registering. Please verify your email address by clicking the button below:
        </p>
        <a href="${verificationUrl}" style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-bottom: 24px;">
          Verify Email Address
        </a>
        <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">
          This link will expire in 24 hours.
        </p>
        <p style="color: #64748b; font-size: 14px; margin: 0;">
          If you did not create an account, you can safely ignore this email.
        </p>
      </div>
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
        Powered by SolarZero
      </p>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "Verify your SolarZero account",
    html,
  });
}
