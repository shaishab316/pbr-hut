/*
  Warnings:

  - You are about to drop the column `geohash` on the `rider_profiles` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "rider_profiles_geohash_idx";

-- AlterTable
ALTER TABLE "rider_profiles" DROP COLUMN "geohash",
ADD COLUMN     "h3Index" TEXT;

-- CreateIndex
CREATE INDEX "rider_profiles_h3Index_idx" ON "rider_profiles"("h3Index");
