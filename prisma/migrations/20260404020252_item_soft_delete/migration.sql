-- AlterTable
ALTER TABLE "items" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "items_deletedAt_idx" ON "items"("deletedAt");
