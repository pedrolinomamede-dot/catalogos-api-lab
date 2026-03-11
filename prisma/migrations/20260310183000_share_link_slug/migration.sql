ALTER TABLE "ShareLinkV2"
ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "ShareLinkV2_slug_key" ON "ShareLinkV2"("slug");
