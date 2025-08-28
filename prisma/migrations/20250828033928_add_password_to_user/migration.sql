/*
  Warnings:

  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add password column with a temporary default value
ALTER TABLE "public"."User" ADD COLUMN "password" TEXT;

-- Set a temporary hashed password for existing users (bcrypt hash for 'temp123456')
UPDATE "public"."User" SET "password" = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8.1aANsRfxgOl2VWp5i' WHERE "password" IS NULL;

-- Make the password column NOT NULL
ALTER TABLE "public"."User" ALTER COLUMN "password" SET NOT NULL;
