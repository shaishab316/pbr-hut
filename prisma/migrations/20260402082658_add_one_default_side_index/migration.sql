-- CreateIndex
CREATE UNIQUE INDEX one_default_side_per_item
ON side_options ("itemId")
WHERE "isDefault" = true;