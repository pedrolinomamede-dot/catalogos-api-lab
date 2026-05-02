ALTER TABLE "ProductBaseV2"
ADD COLUMN "integrationSyncLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "integrationSyncLockedAt" TIMESTAMP(3),
ADD COLUMN "integrationSyncLockReason" TEXT,
ADD COLUMN "integrationSyncLockedByUserId" UUID;

CREATE INDEX "ProductBaseV2_integrationSyncLocked_idx"
ON "ProductBaseV2"("integrationSyncLocked");
