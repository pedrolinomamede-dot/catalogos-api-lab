-- CreateTable
CREATE TABLE "ProductBaseV2" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBaseV2_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductBaseV2_brandId_idx" ON "ProductBaseV2"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBaseV2_brandId_sku_key" ON "ProductBaseV2"("brandId", "sku");

