-- CreateTable
CREATE TABLE "order_declines" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_declines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_declines_riderId_idx" ON "order_declines"("riderId");

-- CreateIndex
CREATE UNIQUE INDEX "order_declines_orderId_riderId_key" ON "order_declines"("orderId", "riderId");

-- AddForeignKey
ALTER TABLE "order_declines" ADD CONSTRAINT "order_declines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_declines" ADD CONSTRAINT "order_declines_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
