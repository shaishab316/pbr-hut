-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "customNote" TEXT,
    "selectedSizeVariantId" TEXT,
    "selectedSideOptionId" TEXT,
    "sizePrice" DECIMAL(10,2),
    "sidePrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_item_extras" (
    "id" TEXT NOT NULL,
    "cartItemId" TEXT NOT NULL,
    "itemExtraId" TEXT,
    "extraName" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "cart_item_extras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carts_userId_key" ON "carts"("userId");

-- CreateIndex
CREATE INDEX "carts_userId_idx" ON "carts"("userId");

-- CreateIndex
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");

-- CreateIndex
CREATE INDEX "cart_items_itemId_idx" ON "cart_items"("itemId");

-- CreateIndex
CREATE INDEX "cart_items_selectedSizeVariantId_idx" ON "cart_items"("selectedSizeVariantId");

-- CreateIndex
CREATE INDEX "cart_items_selectedSideOptionId_idx" ON "cart_items"("selectedSideOptionId");

-- CreateIndex
CREATE INDEX "cart_item_extras_cartItemId_idx" ON "cart_item_extras"("cartItemId");

-- CreateIndex
CREATE INDEX "cart_item_extras_itemExtraId_idx" ON "cart_item_extras"("itemExtraId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_item_extras_cartItemId_itemExtraId_key" ON "cart_item_extras"("cartItemId", "itemExtraId");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_selectedSizeVariantId_fkey" FOREIGN KEY ("selectedSizeVariantId") REFERENCES "size_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_selectedSideOptionId_fkey" FOREIGN KEY ("selectedSideOptionId") REFERENCES "side_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item_extras" ADD CONSTRAINT "cart_item_extras_cartItemId_fkey" FOREIGN KEY ("cartItemId") REFERENCES "cart_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item_extras" ADD CONSTRAINT "cart_item_extras_itemExtraId_fkey" FOREIGN KEY ("itemExtraId") REFERENCES "item_extras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
