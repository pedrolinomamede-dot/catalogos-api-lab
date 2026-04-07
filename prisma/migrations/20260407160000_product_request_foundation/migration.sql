-- CreateEnum
CREATE TYPE "ProductRequestStatus" AS ENUM (
  'OPEN',
  'REVIEWED',
  'CONTACTED',
  'RESOLVED',
  'DISMISSED'
);

-- CreateTable
CREATE TABLE "ProductRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "brandId" UUID NOT NULL,
  "ownerUserId" UUID,
  "shareLinkId" UUID,
  "customerProfileId" UUID,
  "channel" "OrderIntentChannel" NOT NULL,
  "status" "ProductRequestStatus" NOT NULL DEFAULT 'OPEN',
  "requestText" TEXT NOT NULL,
  "categoryHint" TEXT,
  "quantityHint" INTEGER,
  "city" TEXT,
  "state" TEXT,
  "contactName" TEXT,
  "contactPhone" TEXT,
  "contactEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductRequest_brandId_idx" ON "ProductRequest"("brandId");

-- CreateIndex
CREATE INDEX "ProductRequest_ownerUserId_idx" ON "ProductRequest"("ownerUserId");

-- CreateIndex
CREATE INDEX "ProductRequest_shareLinkId_idx" ON "ProductRequest"("shareLinkId");

-- CreateIndex
CREATE INDEX "ProductRequest_customerProfileId_idx" ON "ProductRequest"("customerProfileId");

-- CreateIndex
CREATE INDEX "ProductRequest_channel_idx" ON "ProductRequest"("channel");

-- CreateIndex
CREATE INDEX "ProductRequest_status_idx" ON "ProductRequest"("status");

-- CreateIndex
CREATE INDEX "ProductRequest_createdAt_idx" ON "ProductRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ProductRequest_brandId_status_createdAt_idx" ON "ProductRequest"("brandId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductRequest"
ADD CONSTRAINT "ProductRequest_brandId_fkey"
FOREIGN KEY ("brandId") REFERENCES "Brand"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRequest"
ADD CONSTRAINT "ProductRequest_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRequest"
ADD CONSTRAINT "ProductRequest_shareLinkId_fkey"
FOREIGN KEY ("shareLinkId") REFERENCES "ShareLinkV2"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRequest"
ADD CONSTRAINT "ProductRequest_customerProfileId_fkey"
FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
