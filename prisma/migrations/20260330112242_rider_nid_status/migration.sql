-- AlterEnum
ALTER TYPE "NidStatus" ADD VALUE 'NOT_SUBMITTED';

-- AlterTable
ALTER TABLE "rider_profiles" ALTER COLUMN "nidStatus" SET DEFAULT 'NOT_SUBMITTED';
