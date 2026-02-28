-- CreateTable
CREATE TABLE "CatalogV2" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogItemV2" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "catalogId" UUID NOT NULL,
    "productBaseId" UUID NOT NULL,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogItemV2_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogV2_brandId_idx" ON "CatalogV2"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogV2_brandId_name_key" ON "CatalogV2"("brandId", "name");

-- CreateIndex
CREATE INDEX "CatalogItemV2_brandId_idx" ON "CatalogItemV2"("brandId");

-- CreateIndex
CREATE INDEX "CatalogItemV2_catalogId_idx" ON "CatalogItemV2"("catalogId");

-- CreateIndex
CREATE INDEX "CatalogItemV2_productBaseId_idx" ON "CatalogItemV2"("productBaseId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItemV2_catalogId_productBaseId_key" ON "CatalogItemV2"("catalogId", "productBaseId");

-- AddForeignKey
ALTER TABLE "CatalogItemV2" ADD CONSTRAINT "CatalogItemV2_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "CatalogV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogItemV2" ADD CONSTRAINT "CatalogItemV2_productBaseId_fkey" FOREIGN KEY ("productBaseId") REFERENCES "ProductBaseV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
