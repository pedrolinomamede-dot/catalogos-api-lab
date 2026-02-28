-- AlterTable
ALTER TABLE "ProductBaseV2" ADD COLUMN     "categoryId" UUID,
ADD COLUMN     "subcategoryId" UUID;

-- CreateTable
CREATE TABLE "CategoryV2" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcategoryV2" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubcategoryV2_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryV2_brandId_idx" ON "CategoryV2"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryV2_brandId_name_key" ON "CategoryV2"("brandId", "name");

-- CreateIndex
CREATE INDEX "SubcategoryV2_brandId_idx" ON "SubcategoryV2"("brandId");

-- CreateIndex
CREATE INDEX "SubcategoryV2_categoryId_idx" ON "SubcategoryV2"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SubcategoryV2_brandId_categoryId_name_key" ON "SubcategoryV2"("brandId", "categoryId", "name");

-- CreateIndex
CREATE INDEX "ProductBaseV2_categoryId_idx" ON "ProductBaseV2"("categoryId");

-- CreateIndex
CREATE INDEX "ProductBaseV2_subcategoryId_idx" ON "ProductBaseV2"("subcategoryId");

-- AddForeignKey
ALTER TABLE "ProductBaseV2" ADD CONSTRAINT "ProductBaseV2_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CategoryV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBaseV2" ADD CONSTRAINT "ProductBaseV2_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "SubcategoryV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcategoryV2" ADD CONSTRAINT "SubcategoryV2_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CategoryV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
