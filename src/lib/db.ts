import { PrismaClient } from "@prisma/client";
import { cleanEnvValue } from "./env";

// Normalize env vars that may contain stray newlines from Vercel CLI piping
const databaseUrl = cleanEnvValue(process.env.DATABASE_URL);
if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}
const directUrl = cleanEnvValue(process.env.DIRECT_URL);
if (directUrl) {
  process.env.DIRECT_URL = directUrl;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
