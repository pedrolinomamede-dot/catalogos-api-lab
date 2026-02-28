-- Drop and recreate V2 foreign keys with cascade/set null
ALTER TABLE "ProductBaseV2" DROP CONSTRAINT "ProductBaseV2_categoryId_fkey";
ALTER TABLE "ProductBaseV2" ADD CONSTRAINT "ProductBaseV2_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CategoryV2"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductBaseV2" DROP CONSTRAINT "ProductBaseV2_subcategoryId_fkey";
ALTER TABLE "ProductBaseV2" ADD CONSTRAINT "ProductBaseV2_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "SubcategoryV2"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SubcategoryV2" DROP CONSTRAINT "SubcategoryV2_categoryId_fkey";
ALTER TABLE "SubcategoryV2" ADD CONSTRAINT "SubcategoryV2_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CategoryV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CatalogItemV2" DROP CONSTRAINT "CatalogItemV2_catalogId_fkey";
ALTER TABLE "CatalogItemV2" ADD CONSTRAINT "CatalogItemV2_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "CatalogV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShareLinkCatalogV2" DROP CONSTRAINT "ShareLinkCatalogV2_shareLinkId_fkey";
ALTER TABLE "ShareLinkCatalogV2" ADD CONSTRAINT "ShareLinkCatalogV2_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "ShareLinkV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShareLinkCatalogV2" DROP CONSTRAINT "ShareLinkCatalogV2_catalogId_fkey";
ALTER TABLE "ShareLinkCatalogV2" ADD CONSTRAINT "ShareLinkCatalogV2_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "CatalogV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;
