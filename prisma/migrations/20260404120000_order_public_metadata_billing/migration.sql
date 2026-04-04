-- AlterTable
ALTER TABLE "orders" ADD COLUMN "orderNumber" TEXT;
ALTER TABLE "orders" ADD COLUMN "confirmationCode" TEXT;
ALTER TABLE "orders" ADD COLUMN "estimatedArrivalAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "deliveredAt" TIMESTAMP(3);

-- Backfill existing orders (if any) before NOT NULL constraints
UPDATE "orders"
SET
  "orderNumber" = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 10)),
  "confirmationCode" = LPAD((FLOOR(RANDOM() * 9000 + 1000)::int)::text, 4, '0')
WHERE
  "orderNumber" IS NULL;

ALTER TABLE "orders" ALTER COLUMN "orderNumber" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "confirmationCode" SET NOT NULL;

CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- AlterTable
ALTER TABLE "order_delivery_addresses" ADD COLUMN "locationLabel" TEXT;

-- CreateTable
CREATE TABLE "order_billing_addresses" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "suburb" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "state" TEXT NOT NULL,

    CONSTRAINT "order_billing_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_billing_addresses_orderId_key" ON "order_billing_addresses"("orderId");

-- AddForeignKey
ALTER TABLE "order_billing_addresses" ADD CONSTRAINT "order_billing_addresses_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
