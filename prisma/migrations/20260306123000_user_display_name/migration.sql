-- Add display name column for profile editing
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "displayName" TEXT;
