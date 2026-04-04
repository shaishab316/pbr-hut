-- AlterTable
ALTER TABLE "orders" ADD COLUMN "h3Index" TEXT;
ALTER TABLE "orders" ADD COLUMN "assignedRiderId" TEXT;

-- CreateIndex
CREATE INDEX "orders_h3Index_idx" ON "orders"("h3Index");

-- CreateIndex
CREATE INDEX "orders_assignedRiderId_idx" ON "orders"("assignedRiderId");

-- CreateIndex
CREATE INDEX "orders_h3Index_status_idx" ON "orders"("h3Index", "status");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_assignedRiderId_fkey" FOREIGN KEY ("assignedRiderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
