ALTER TABLE "Brand"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Brand_isActive_idx" ON "Brand"("isActive");
