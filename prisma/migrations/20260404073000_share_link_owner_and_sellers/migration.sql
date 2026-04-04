ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SELLER';

ALTER TABLE "User"
ADD COLUMN "whatsappPhone" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "ShareLinkV2"
ADD COLUMN "ownerUserId" UUID;

UPDATE "ShareLinkV2" AS sl
SET "ownerUserId" = (
  SELECT u."id"
  FROM "User" AS u
  WHERE u."brandId" = sl."brandId"
  ORDER BY
    CASE WHEN u."role" = 'ADMIN'::"UserRole" THEN 0 ELSE 1 END,
    u."createdAt" ASC
  LIMIT 1
)
WHERE sl."ownerUserId" IS NULL;

ALTER TABLE "ShareLinkV2"
ALTER COLUMN "ownerUserId" SET NOT NULL;

ALTER TABLE "ShareLinkV2"
ADD CONSTRAINT "ShareLinkV2_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

CREATE INDEX "ShareLinkV2_ownerUserId_idx" ON "ShareLinkV2"("ownerUserId");
