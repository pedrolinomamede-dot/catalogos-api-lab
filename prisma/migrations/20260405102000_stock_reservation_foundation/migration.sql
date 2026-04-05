CREATE TYPE "StockReservationStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CONVERTED', 'CANCELED');

CREATE TABLE "StockReservation" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "orderIntentId" UUID NOT NULL,
    "status" "StockReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StockReservationItem" (
    "id" UUID NOT NULL,
    "stockReservationId" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "productBaseId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockReservationItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StockReservation_orderIntentId_key" ON "StockReservation"("orderIntentId");
CREATE INDEX "StockReservation_brandId_idx" ON "StockReservation"("brandId");
CREATE INDEX "StockReservation_status_idx" ON "StockReservation"("status");
CREATE INDEX "StockReservation_expiresAt_idx" ON "StockReservation"("expiresAt");

CREATE UNIQUE INDEX "StockReservationItem_stockReservationId_productBaseId_key"
ON "StockReservationItem"("stockReservationId", "productBaseId");
CREATE INDEX "StockReservationItem_stockReservationId_idx" ON "StockReservationItem"("stockReservationId");
CREATE INDEX "StockReservationItem_brandId_idx" ON "StockReservationItem"("brandId");
CREATE INDEX "StockReservationItem_productBaseId_idx" ON "StockReservationItem"("productBaseId");

ALTER TABLE "StockReservation"
ADD CONSTRAINT "StockReservation_brandId_fkey"
FOREIGN KEY ("brandId") REFERENCES "Brand"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "StockReservation"
ADD CONSTRAINT "StockReservation_orderIntentId_fkey"
FOREIGN KEY ("orderIntentId") REFERENCES "OrderIntent"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "StockReservationItem"
ADD CONSTRAINT "StockReservationItem_stockReservationId_fkey"
FOREIGN KEY ("stockReservationId") REFERENCES "StockReservation"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "StockReservationItem"
ADD CONSTRAINT "StockReservationItem_productBaseId_fkey"
FOREIGN KEY ("productBaseId") REFERENCES "ProductBaseV2"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
