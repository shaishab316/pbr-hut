-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "h3Index" TEXT,
    "openingHour" TEXT NOT NULL,
    "closingHour" TEXT NOT NULL,
    "deliveryRadius" DOUBLE PRECISION NOT NULL,
    "baseDeliveryFee" DECIMAL(10,2) NOT NULL,
    "minimumOrderAmountCOD" DECIMAL(10,2) NOT NULL,
    "isCODEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "restaurants_h3Index_idx" ON "restaurants"("h3Index");
