-- CreateEnum
CREATE TYPE "IntegrationMode" AS ENUM ('MANUAL_CSV', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('VAREJONLINE', 'OMIE', 'TINY', 'BLING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "IntegrationConnectionStatus" AS ENUM ('CONNECTED', 'EXPIRED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "ProductSourceType" AS ENUM ('MANUAL', 'CSV', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "IntegrationSyncJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "IntegrationSyncJobMode" AS ENUM ('MANUAL', 'SCHEDULED', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "IntegrationSyncResource" AS ENUM ('FULL', 'PRODUCTS', 'CATEGORIES', 'IMAGES');

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "integrationMode" "IntegrationMode" NOT NULL DEFAULT 'MANUAL_CSV';

-- AlterTable
ALTER TABLE "ProductBaseV2" ADD COLUMN     "externalMetadataJson" JSONB,
ADD COLUMN     "integrationConnectionId" UUID,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "price" DECIMAL(10,2),
ADD COLUMN     "sourceExternalCode" TEXT,
ADD COLUMN     "sourceExternalId" TEXT,
ADD COLUMN     "sourceProvider" "IntegrationProvider",
ADD COLUMN     "sourceType" "ProductSourceType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "sourceUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "stockQuantity" INTEGER;

-- CreateTable
CREATE TABLE "CatalogItemSnapshotV2" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "catalogItemId" UUID NOT NULL,
    "snapshotVersion" INTEGER NOT NULL DEFAULT 1,
    "sourceType" "ProductSourceType" NOT NULL,
    "sourceProvider" "IntegrationProvider",
    "sourceExternalId" TEXT,
    "sourceExternalCode" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "barcode" TEXT,
    "brand" TEXT,
    "description" TEXT,
    "categoryId" UUID,
    "categoryName" TEXT,
    "subcategoryId" UUID,
    "subcategoryName" TEXT,
    "price" DECIMAL(10,2),
    "primaryImageUrl" TEXT,
    "galleryJson" JSONB,
    "attributesJson" JSONB,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refreshedAt" TIMESTAMP(3),

    CONSTRAINT "CatalogItemSnapshotV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConnectionV2" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "IntegrationConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "externalCompanyId" TEXT,
    "externalCompanyName" TEXT,
    "externalCompanyDocument" TEXT,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnectionV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationCategoryMappingV2" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "integrationConnectionId" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "externalCategoryId" TEXT,
    "externalCategoryName" TEXT NOT NULL,
    "localCategoryId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationCategoryMappingV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSubcategoryMappingV2" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "integrationConnectionId" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "externalSubcategoryId" TEXT,
    "externalSubcategoryName" TEXT NOT NULL,
    "localSubcategoryId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSubcategoryMappingV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSyncJobV2" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "integrationConnectionId" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "resource" "IntegrationSyncResource" NOT NULL,
    "mode" "IntegrationSyncJobMode" NOT NULL,
    "status" "IntegrationSyncJobStatus" NOT NULL DEFAULT 'QUEUED',
    "statsJson" JSONB,
    "errorJson" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSyncJobV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSyncCursorV2" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "integrationConnectionId" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "resource" "IntegrationSyncResource" NOT NULL,
    "cursorValue" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationSyncCursorV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationWebhookEventV2" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "integrationConnectionId" UUID,
    "provider" "IntegrationProvider" NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalEventId" TEXT,
    "payloadJson" JSONB NOT NULL,
    "status" "IntegrationSyncJobStatus" NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationWebhookEventV2_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItemSnapshotV2_catalogItemId_key" ON "CatalogItemSnapshotV2"("catalogItemId");

-- CreateIndex
CREATE INDEX "CatalogItemSnapshotV2_brandId_idx" ON "CatalogItemSnapshotV2"("brandId");

-- CreateIndex
CREATE INDEX "CatalogItemSnapshotV2_categoryId_idx" ON "CatalogItemSnapshotV2"("categoryId");

-- CreateIndex
CREATE INDEX "CatalogItemSnapshotV2_subcategoryId_idx" ON "CatalogItemSnapshotV2"("subcategoryId");

-- CreateIndex
CREATE INDEX "CatalogItemSnapshotV2_sourceType_idx" ON "CatalogItemSnapshotV2"("sourceType");

-- CreateIndex
CREATE INDEX "CatalogItemSnapshotV2_sourceProvider_idx" ON "CatalogItemSnapshotV2"("sourceProvider");

-- CreateIndex
CREATE INDEX "IntegrationConnectionV2_brandId_idx" ON "IntegrationConnectionV2"("brandId");

-- CreateIndex
CREATE INDEX "IntegrationConnectionV2_provider_idx" ON "IntegrationConnectionV2"("provider");

-- CreateIndex
CREATE INDEX "IntegrationConnectionV2_status_idx" ON "IntegrationConnectionV2"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnectionV2_brandId_provider_key" ON "IntegrationConnectionV2"("brandId", "provider");

-- CreateIndex
CREATE INDEX "IntegrationCategoryMappingV2_brandId_idx" ON "IntegrationCategoryMappingV2"("brandId");

-- CreateIndex
CREATE INDEX "IntegrationCategoryMappingV2_provider_idx" ON "IntegrationCategoryMappingV2"("provider");

-- CreateIndex
CREATE INDEX "IntegrationCategoryMappingV2_localCategoryId_idx" ON "IntegrationCategoryMappingV2"("localCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationCategoryMappingV2_integrationConnectionId_localC_key" ON "IntegrationCategoryMappingV2"("integrationConnectionId", "localCategoryId", "externalCategoryName");

-- CreateIndex
CREATE INDEX "IntegrationSubcategoryMappingV2_brandId_idx" ON "IntegrationSubcategoryMappingV2"("brandId");

-- CreateIndex
CREATE INDEX "IntegrationSubcategoryMappingV2_provider_idx" ON "IntegrationSubcategoryMappingV2"("provider");

-- CreateIndex
CREATE INDEX "IntegrationSubcategoryMappingV2_localSubcategoryId_idx" ON "IntegrationSubcategoryMappingV2"("localSubcategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSubcategoryMappingV2_integrationConnectionId_loc_key" ON "IntegrationSubcategoryMappingV2"("integrationConnectionId", "localSubcategoryId", "externalSubcategoryName");

-- CreateIndex
CREATE INDEX "IntegrationSyncJobV2_brandId_idx" ON "IntegrationSyncJobV2"("brandId");

-- CreateIndex
CREATE INDEX "IntegrationSyncJobV2_integrationConnectionId_idx" ON "IntegrationSyncJobV2"("integrationConnectionId");

-- CreateIndex
CREATE INDEX "IntegrationSyncJobV2_provider_idx" ON "IntegrationSyncJobV2"("provider");

-- CreateIndex
CREATE INDEX "IntegrationSyncJobV2_status_idx" ON "IntegrationSyncJobV2"("status");

-- CreateIndex
CREATE INDEX "IntegrationSyncCursorV2_brandId_idx" ON "IntegrationSyncCursorV2"("brandId");

-- CreateIndex
CREATE INDEX "IntegrationSyncCursorV2_provider_idx" ON "IntegrationSyncCursorV2"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSyncCursorV2_integrationConnectionId_resource_key" ON "IntegrationSyncCursorV2"("integrationConnectionId", "resource");

-- CreateIndex
CREATE INDEX "IntegrationWebhookEventV2_brandId_idx" ON "IntegrationWebhookEventV2"("brandId");

-- CreateIndex
CREATE INDEX "IntegrationWebhookEventV2_provider_idx" ON "IntegrationWebhookEventV2"("provider");

-- CreateIndex
CREATE INDEX "IntegrationWebhookEventV2_integrationConnectionId_idx" ON "IntegrationWebhookEventV2"("integrationConnectionId");

-- CreateIndex
CREATE INDEX "ProductBaseV2_sourceType_idx" ON "ProductBaseV2"("sourceType");

-- CreateIndex
CREATE INDEX "ProductBaseV2_sourceProvider_idx" ON "ProductBaseV2"("sourceProvider");

-- CreateIndex
CREATE INDEX "ProductBaseV2_integrationConnectionId_idx" ON "ProductBaseV2"("integrationConnectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBaseV2_integrationConnectionId_sourceExternalId_key" ON "ProductBaseV2"("integrationConnectionId", "sourceExternalId");

-- AddForeignKey
ALTER TABLE "ProductBaseV2" ADD CONSTRAINT "ProductBaseV2_integrationConnectionId_fkey" FOREIGN KEY ("integrationConnectionId") REFERENCES "IntegrationConnectionV2"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogItemSnapshotV2" ADD CONSTRAINT "CatalogItemSnapshotV2_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItemV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConnectionV2" ADD CONSTRAINT "IntegrationConnectionV2_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationCategoryMappingV2" ADD CONSTRAINT "IntegrationCategoryMappingV2_integrationConnectionId_fkey" FOREIGN KEY ("integrationConnectionId") REFERENCES "IntegrationConnectionV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationCategoryMappingV2" ADD CONSTRAINT "IntegrationCategoryMappingV2_localCategoryId_fkey" FOREIGN KEY ("localCategoryId") REFERENCES "CategoryV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationSubcategoryMappingV2" ADD CONSTRAINT "IntegrationSubcategoryMappingV2_integrationConnectionId_fkey" FOREIGN KEY ("integrationConnectionId") REFERENCES "IntegrationConnectionV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationSubcategoryMappingV2" ADD CONSTRAINT "IntegrationSubcategoryMappingV2_localSubcategoryId_fkey" FOREIGN KEY ("localSubcategoryId") REFERENCES "SubcategoryV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationSyncJobV2" ADD CONSTRAINT "IntegrationSyncJobV2_integrationConnectionId_fkey" FOREIGN KEY ("integrationConnectionId") REFERENCES "IntegrationConnectionV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationSyncCursorV2" ADD CONSTRAINT "IntegrationSyncCursorV2_integrationConnectionId_fkey" FOREIGN KEY ("integrationConnectionId") REFERENCES "IntegrationConnectionV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationWebhookEventV2" ADD CONSTRAINT "IntegrationWebhookEventV2_integrationConnectionId_fkey" FOREIGN KEY ("integrationConnectionId") REFERENCES "IntegrationConnectionV2"("id") ON DELETE SET NULL ON UPDATE CASCADE;

