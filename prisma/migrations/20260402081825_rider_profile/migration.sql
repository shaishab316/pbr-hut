-- CreateEnum
CREATE TYPE "NidStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "rider_profiles" (
    "userId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "h3Index" TEXT,
    "nidFrontUrl" TEXT,
    "nidBackUrl" TEXT,
    "nidStatus" "NidStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "isBusy" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rider_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "rider_profiles_h3Index_idx" ON "rider_profiles"("h3Index");

-- CreateIndex
CREATE INDEX "rider_profiles_isAvailable_isBusy_nidStatus_idx" ON "rider_profiles"("isAvailable", "isBusy", "nidStatus");

-- AddForeignKey
ALTER TABLE "rider_profiles" ADD CONSTRAINT "rider_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
