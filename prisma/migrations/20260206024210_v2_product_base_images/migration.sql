-- CreateTable
CREATE TABLE "ProductBaseImageV2" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "productBaseId" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBaseImageV2_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductBaseImageV2_brandId_idx" ON "ProductBaseImageV2"("brandId");

-- CreateIndex
CREATE INDEX "ProductBaseImageV2_productBaseId_idx" ON "ProductBaseImageV2"("productBaseId");

-- AddForeignKey
ALTER TABLE "ProductBaseImageV2" ADD CONSTRAINT "ProductBaseImageV2_productBaseId_fkey" FOREIGN KEY ("productBaseId") REFERENCES "ProductBaseV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;
