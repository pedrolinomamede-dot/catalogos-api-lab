CREATE TABLE "CustomerProfile" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OrderIntent"
ADD COLUMN "customerProfileId" UUID;

CREATE UNIQUE INDEX "CustomerProfile_brandId_email_key"
ON "CustomerProfile"("brandId", "email");

CREATE UNIQUE INDEX "CustomerProfile_brandId_whatsapp_key"
ON "CustomerProfile"("brandId", "whatsapp");

CREATE INDEX "CustomerProfile_brandId_idx" ON "CustomerProfile"("brandId");
CREATE INDEX "CustomerProfile_email_idx" ON "CustomerProfile"("email");
CREATE INDEX "CustomerProfile_whatsapp_idx" ON "CustomerProfile"("whatsapp");
CREATE INDEX "CustomerProfile_lastSeenAt_idx" ON "CustomerProfile"("lastSeenAt");
CREATE INDEX "OrderIntent_customerProfileId_idx" ON "OrderIntent"("customerProfileId");

ALTER TABLE "CustomerProfile"
ADD CONSTRAINT "CustomerProfile_brandId_fkey"
FOREIGN KEY ("brandId") REFERENCES "Brand"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "OrderIntent"
ADD CONSTRAINT "OrderIntent_customerProfileId_fkey"
FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
