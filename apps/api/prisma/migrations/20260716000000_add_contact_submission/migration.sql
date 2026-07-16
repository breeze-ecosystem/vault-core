/*
  Migration: Add ContactSubmission model for public contact form

  Stores contact form submissions from the marketing site with name, email,
  optional company, and message text. No tenant scoping (public endpoint).
*/

-- Create ContactSubmission table
CREATE TABLE "ContactSubmission" (
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    message TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY (id)
);

-- Indexes for lookups and ordering
CREATE INDEX "ContactSubmission_email_idx" ON "ContactSubmission"("email");
CREATE INDEX "ContactSubmission_createdAt_idx" ON "ContactSubmission"("createdAt");
