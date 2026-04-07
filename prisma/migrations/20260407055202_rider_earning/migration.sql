-- CreateEnum
CREATE TYPE "EarningStatus" AS ENUM ('PENDING', 'SETTLED', 'CANCELLED');

-- AlterTable
ALTER TABLE "rider_profiles" ADD COLUMN     "availableBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalEarned" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "rider_earnings" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "orderId" TEXT,
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tip" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "status" "EarningStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rider_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rider_earnings_orderId_key" ON "rider_earnings"("orderId");

-- CreateIndex
CREATE INDEX "rider_earnings_riderId_idx" ON "rider_earnings"("riderId");

-- CreateIndex
CREATE INDEX "rider_earnings_riderId_createdAt_idx" ON "rider_earnings"("riderId", "createdAt");

-- AddForeignKey
ALTER TABLE "rider_earnings" ADD CONSTRAINT "rider_earnings_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_earnings" ADD CONSTRAINT "rider_earnings_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "rider_profiles"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
