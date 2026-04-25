-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "hasSizeVariants" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "basePrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "sub_categories" ADD COLUMN     "hasSizeVariants" BOOLEAN NOT NULL DEFAULT false;
