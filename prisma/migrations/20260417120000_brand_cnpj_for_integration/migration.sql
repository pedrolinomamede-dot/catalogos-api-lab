ALTER TABLE "Brand" ADD COLUMN "cnpj" TEXT;

CREATE UNIQUE INDEX "Brand_cnpj_key" ON "Brand"("cnpj");
