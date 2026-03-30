-- CreateEnum
CREATE TYPE "NidStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "rider_profiles" (
    "userId" TEXT NOT NULL,
    "geohash" TEXT,
    "nidFrontUrl" TEXT,
    "nidBackUrl" TEXT,
    "nidStatus" "NidStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "isBusy" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rider_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "rider_profiles_geohash_idx" ON "rider_profiles"("geohash");

-- CreateIndex
CREATE INDEX "rider_profiles_isAvailable_isBusy_nidStatus_idx" ON "rider_profiles"("isAvailable", "isBusy", "nidStatus");

-- AddForeignKey
ALTER TABLE "rider_profiles" ADD CONSTRAINT "rider_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
