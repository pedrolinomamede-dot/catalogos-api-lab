CREATE TYPE "OrderIntentChannel" AS ENUM ('SHARE_LINK', 'SITE');

CREATE TYPE "OrderIntentStatus" AS ENUM ('OPEN', 'BILLED', 'CANCELED', 'EXPIRED');

CREATE TABLE "OrderIntent" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "ownerUserId" UUID,
    "shareLinkId" UUID,
    "channel" "OrderIntentChannel" NOT NULL,
    "status" "OrderIntentStatus" NOT NULL DEFAULT 'OPEN',
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerWhatsapp" TEXT,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "sellerNameSnapshot" TEXT,
    "sellerWhatsappSnapshot" TEXT,
    "subtotal" DECIMAL(10,2),
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "billedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderIntent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderIntentItem" (
    "id" UUID NOT NULL,
    "orderIntentId" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "catalogId" UUID,
    "productBaseId" UUID NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT,
    "catalogName" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2),
    "lineTotal" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderIntentItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderIntent_brandId_idx" ON "OrderIntent"("brandId");
CREATE INDEX "OrderIntent_ownerUserId_idx" ON "OrderIntent"("ownerUserId");
CREATE INDEX "OrderIntent_shareLinkId_idx" ON "OrderIntent"("shareLinkId");
CREATE INDEX "OrderIntent_channel_idx" ON "OrderIntent"("channel");
CREATE INDEX "OrderIntent_status_idx" ON "OrderIntent"("status");
CREATE INDEX "OrderIntent_createdAt_idx" ON "OrderIntent"("createdAt");

CREATE INDEX "OrderIntentItem_orderIntentId_idx" ON "OrderIntentItem"("orderIntentId");
CREATE INDEX "OrderIntentItem_brandId_idx" ON "OrderIntentItem"("brandId");
CREATE INDEX "OrderIntentItem_catalogId_idx" ON "OrderIntentItem"("catalogId");
CREATE INDEX "OrderIntentItem_productBaseId_idx" ON "OrderIntentItem"("productBaseId");

ALTER TABLE "OrderIntent"
ADD CONSTRAINT "OrderIntent_brandId_fkey"
FOREIGN KEY ("brandId") REFERENCES "Brand"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "OrderIntent"
ADD CONSTRAINT "OrderIntent_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "OrderIntent"
ADD CONSTRAINT "OrderIntent_shareLinkId_fkey"
FOREIGN KEY ("shareLinkId") REFERENCES "ShareLinkV2"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "OrderIntentItem"
ADD CONSTRAINT "OrderIntentItem_orderIntentId_fkey"
FOREIGN KEY ("orderIntentId") REFERENCES "OrderIntent"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
