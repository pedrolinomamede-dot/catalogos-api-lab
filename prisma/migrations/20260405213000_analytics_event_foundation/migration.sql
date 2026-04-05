CREATE TABLE "AnalyticsEvent" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "shareLinkId" UUID,
    "ownerUserId" UUID,
    "productBaseId" UUID,
    "orderIntentId" UUID,
    "channel" "OrderIntentChannel" NOT NULL,
    "eventName" TEXT NOT NULL,
    "sessionKey" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "referrer" TEXT,
    "metadataJson" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalyticsEvent_brandId_idx" ON "AnalyticsEvent"("brandId");
CREATE INDEX "AnalyticsEvent_shareLinkId_idx" ON "AnalyticsEvent"("shareLinkId");
CREATE INDEX "AnalyticsEvent_ownerUserId_idx" ON "AnalyticsEvent"("ownerUserId");
CREATE INDEX "AnalyticsEvent_productBaseId_idx" ON "AnalyticsEvent"("productBaseId");
CREATE INDEX "AnalyticsEvent_orderIntentId_idx" ON "AnalyticsEvent"("orderIntentId");
CREATE INDEX "AnalyticsEvent_channel_idx" ON "AnalyticsEvent"("channel");
CREATE INDEX "AnalyticsEvent_eventName_idx" ON "AnalyticsEvent"("eventName");
CREATE INDEX "AnalyticsEvent_occurredAt_idx" ON "AnalyticsEvent"("occurredAt");
CREATE INDEX "AnalyticsEvent_brandId_eventName_occurredAt_idx"
ON "AnalyticsEvent"("brandId", "eventName", "occurredAt");

ALTER TABLE "AnalyticsEvent"
ADD CONSTRAINT "AnalyticsEvent_brandId_fkey"
FOREIGN KEY ("brandId") REFERENCES "Brand"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
