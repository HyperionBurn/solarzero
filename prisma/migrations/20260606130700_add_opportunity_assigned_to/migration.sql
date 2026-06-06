-- Add the opportunity assignee field expected by the current Prisma schema.
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "assignedTo" TEXT;
