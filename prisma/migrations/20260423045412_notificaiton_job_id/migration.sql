/*
  Warnings:

  - A unique constraint covering the columns `[jobId]` on the table `notifications` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "jobId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "notifications_jobId_key" ON "notifications"("jobId");
