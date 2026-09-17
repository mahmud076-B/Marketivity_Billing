-- Phase 2F: Internal Agency Access Control & Role-Based Permissions

ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'staff';

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS "team_invitations" (
  "id" text NOT NULL PRIMARY KEY,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "tokenHash" text NOT NULL UNIQUE,
  "expiresAt" timestamptz NOT NULL,
  "usedAt" timestamptz,
  "createdBy" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "team_invitations_email_idx" ON "team_invitations" ("email");
