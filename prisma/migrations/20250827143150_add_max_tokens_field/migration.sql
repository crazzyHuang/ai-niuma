/*
  Warnings:

  - You are about to drop the column `llmProviderId` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `model` on the `LLMProvider` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Agent" DROP CONSTRAINT "Agent_llmProviderId_fkey";

-- AlterTable
ALTER TABLE "public"."Agent" DROP COLUMN "llmProviderId",
ADD COLUMN     "modelId" TEXT;

-- AlterTable
ALTER TABLE "public"."Conversation" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."LLMProvider" DROP COLUMN "model";

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."LLMModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "description" TEXT,
    "contextLength" INTEGER NOT NULL,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "pricing" JSONB,
    "capabilities" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LLMModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_AgentToLLMProvider" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AgentToLLMProvider_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "LLMModel_providerId_code_key" ON "public"."LLMModel"("providerId", "code");

-- CreateIndex
CREATE INDEX "_AgentToLLMProvider_B_index" ON "public"."_AgentToLLMProvider"("B");

-- AddForeignKey
ALTER TABLE "public"."Agent" ADD CONSTRAINT "Agent_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "public"."LLMModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LLMModel" ADD CONSTRAINT "LLMModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."LLMProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AgentToLLMProvider" ADD CONSTRAINT "_AgentToLLMProvider_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AgentToLLMProvider" ADD CONSTRAINT "_AgentToLLMProvider_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."LLMProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;