-- AlterTable
ALTER TABLE "CatalogV2"
ADD COLUMN "pdfHeaderLeftLogoUrl" TEXT,
ADD COLUMN "pdfHeaderRightLogoUrl" TEXT,
ADD COLUMN "pdfStripeBgColor" TEXT,
ADD COLUMN "pdfStripeLineColor" TEXT,
ADD COLUMN "pdfStripeTextColor" TEXT,
ADD COLUMN "pdfStripeFontFamily" TEXT,
ADD COLUMN "pdfStripeFontWeight" INTEGER,
ADD COLUMN "pdfStripeFontSize" INTEGER;
