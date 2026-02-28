-- CreateTable
CREATE TABLE "ShareLinkV2" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareLinkV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLinkCatalogV2" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "shareLinkId" UUID NOT NULL,
    "catalogId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareLinkCatalogV2_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShareLinkV2_token_key" ON "ShareLinkV2"("token");

-- CreateIndex
CREATE INDEX "ShareLinkV2_brandId_idx" ON "ShareLinkV2"("brandId");

-- CreateIndex
CREATE INDEX "ShareLinkCatalogV2_brandId_idx" ON "ShareLinkCatalogV2"("brandId");

-- CreateIndex
CREATE INDEX "ShareLinkCatalogV2_shareLinkId_idx" ON "ShareLinkCatalogV2"("shareLinkId");

-- CreateIndex
CREATE INDEX "ShareLinkCatalogV2_catalogId_idx" ON "ShareLinkCatalogV2"("catalogId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLinkCatalogV2_shareLinkId_catalogId_key" ON "ShareLinkCatalogV2"("shareLinkId", "catalogId");

-- AddForeignKey
ALTER TABLE "ShareLinkCatalogV2" ADD CONSTRAINT "ShareLinkCatalogV2_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "ShareLinkV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLinkCatalogV2" ADD CONSTRAINT "ShareLinkCatalogV2_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "CatalogV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
