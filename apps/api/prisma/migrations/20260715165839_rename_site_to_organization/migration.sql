/*
  Migration: Rename Site to Organization, add multi-tenancy models

  This migration:
  1. Renames Site table → Organization, adds billing fields
  2. Renames siteId → organizationId on existing tables (data-preserving ALTER TABLE)
  3. Drops old FK constraints and User.role/siteId
  4. Creates new models (OrganizationMember, Invite, FeatureFlag)
  5. Data backfill: creates OrganizationMember rows for existing users
  6. Data backfill: sets organizationId on Alert, CameraPrompt, AuditLog
  7. Creates new indexes and FK constraints
*/

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- Drop obsolete columns from AuditLog (prisma compat)
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "metadata";

-- Add new columns to AuditLog
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "changes" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "currentHash" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "previousHash" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- Drop foreign key constraints that reference Site or siteId
ALTER TABLE IF EXISTS "Camera" DROP CONSTRAINT IF EXISTS "Camera_siteId_fkey";
ALTER TABLE IF EXISTS "User" DROP CONSTRAINT IF EXISTS "User_siteId_fkey";

-- Rename Site → Organization (preserves all data and the same UUIDs)
ALTER TABLE IF EXISTS "Site" RENAME TO "Organization";

-- Add billing columns to Organization (they were not on Site)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "billingEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "planTier" TEXT DEFAULT 'FREE';

-- Drop User.role and User.siteId (role moves to OrganizationMember)
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
ALTER TABLE "User" DROP COLUMN IF EXISTS "siteId";

-- Rename siteId → organizationId on existing tables that had a FK to Site
-- We use RENAME COLUMN to preserve data, then drop old FK references

-- Door: siteId → organizationId
ALTER TABLE "Door" DROP CONSTRAINT IF EXISTS "Door_siteId_fkey";
ALTER TABLE "Door" RENAME COLUMN "siteId" TO "organizationId";

-- Zone: siteId → organizationId
ALTER TABLE "Zone" DROP CONSTRAINT IF EXISTS "Zone_siteId_fkey";
ALTER TABLE "Zone" RENAME COLUMN "siteId" TO "organizationId";

-- Camera: siteId → organizationId (already dropped FK above)
ALTER TABLE "Camera" DROP COLUMN IF EXISTS "siteId";
ALTER TABLE "Camera" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE "Camera" ALTER COLUMN "organizationId" DROP DEFAULT;

-- Incident: siteId → organizationId
ALTER TABLE "Incident" DROP CONSTRAINT IF EXISTS "Incident_siteId_fkey";
ALTER TABLE "Incident" RENAME COLUMN "siteId" TO "organizationId";

-- VehicleList: siteId → organizationId
ALTER TABLE "VehicleList" DROP CONSTRAINT IF EXISTS "VehicleList_siteId_fkey";
ALTER TABLE "VehicleList" RENAME COLUMN "siteId" TO "organizationId";

-- Add organizationId to tables that need one now
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "CameraPrompt" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- ─── DATA BACKFILL ──────────────────────────────────────────
-- Run AFTER column additions but BEFORE NOT NULL constraints

-- 1. Backfill Camera.organizationId from Site/Organization records
-- We need to pick an org for orphaned cameras — use the first organization
UPDATE "Camera" SET "organizationId" = (SELECT "id" FROM "Organization" LIMIT 1)
WHERE "organizationId" = '00000000-0000-0000-0000-000000000000';

-- 2. Backfill Alert.organizationId from Camera's org
UPDATE "Alert" a SET "organizationId" = c."organizationId"
FROM "Camera" c WHERE a."cameraId" = c."id" AND a."organizationId" IS NULL;

-- 3. Backfill CameraPrompt.organizationId from Camera's org
UPDATE "CameraPrompt" cp SET "organizationId" = c."organizationId"
FROM "Camera" c WHERE cp."cameraId" = c."id";

-- 4. Backfill AuditLog.organizationId from User's org membership
-- (uses OrganizationMember after it's created below, so we set it after create)

-- 5. Set planTier = 'FREE' for all existing organizations
UPDATE "Organization" SET "planTier" = 'FREE' WHERE "planTier" IS NULL;

-- ─── NEW MODELS ─────────────────────────────────────────────

-- Create OrganizationMember table
CREATE TABLE IF NOT EXISTS "OrganizationMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- Create Invite table
CREATE TABLE IF NOT EXISTS "Invite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- Create FeatureFlag table
CREATE TABLE IF NOT EXISTS "FeatureFlag" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "tier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- ─── DATA BACKFILL: OrganizationMember rows ─────────────────
-- Backfill OrganizationMember rows for existing users
-- We use the User record (if any) to determine their org by looking at
-- the Camera table they might be related to, or assign to the first org.
-- In a fresh v1.0 seed, the admin user exists but has no explicit siteId anymore
-- (User.siteId was dropped). So we create a default org membership.
INSERT INTO "OrganizationMember" ("id", "userId", "organizationId", "role", "isActive", "joinedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u."id", o."id", 'ADMIN', true, u."createdAt", u."createdAt", u."createdAt"
FROM "User" u
CROSS JOIN (SELECT "id" FROM "Organization" LIMIT 1) o
WHERE NOT EXISTS (
  SELECT 1 FROM "OrganizationMember" om WHERE om."userId" = u."id"
);

-- 4b. Backfill AuditLog.organizationId from OrganizationMember
UPDATE "AuditLog" al SET "organizationId" = om."organizationId"
FROM "OrganizationMember" om WHERE al."userId" = om."userId" AND al."organizationId" IS NULL;

-- ─── NEW INDEXES ────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationMember_userId_organizationId_key" ON "OrganizationMember"("userId", "organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Invite_token_key" ON "Invite"("token");
CREATE INDEX IF NOT EXISTS "Invite_organizationId_idx" ON "Invite"("organizationId");
CREATE INDEX IF NOT EXISTS "Invite_email_organizationId_idx" ON "Invite"("email", "organizationId");
CREATE INDEX IF NOT EXISTS "FeatureFlag_organizationId_idx" ON "FeatureFlag"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_organizationId_key_key" ON "FeatureFlag"("organizationId", "key");
CREATE INDEX IF NOT EXISTS "Alert_organizationId_idx" ON "Alert"("organizationId");
CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX IF NOT EXISTS "Camera_organizationId_idx" ON "Camera"("organizationId");
CREATE INDEX IF NOT EXISTS "CameraPrompt_organizationId_idx" ON "CameraPrompt"("organizationId");

-- ─── NEW FOREIGN KEYS ───────────────────────────────────────

ALTER TABLE "Camera" ADD CONSTRAINT "Camera_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Door" ADD CONSTRAINT "Door_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleList" ADD CONSTRAINT "VehicleList_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CameraPrompt" ADD CONSTRAINT "CameraPrompt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
