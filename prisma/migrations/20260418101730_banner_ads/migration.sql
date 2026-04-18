-- CreateEnum
CREATE TYPE "TargetItem" AS ENUM ('ITEM');

-- CreateTable
CREATE TABLE "banner_ads" (
    "id" TEXT NOT NULL,
    "order" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#FFFFFF',
    "type" "TargetItem" NOT NULL,
    "data" TEXT NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "banner_ads_pkey" PRIMARY KEY ("id")
);
