import { type OrderIntentChannel, Prisma } from "@prisma/client";

import { withBrand } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";
import type { PublicAnalyticsEventName } from "@/types/api";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SUPPORTED_CHANNELS = new Set<OrderIntentChannel>(["SHARE_LINK"]);
const SUPPORTED_EVENTS = new Set<PublicAnalyticsEventName>([
  "share_link_viewed",
  "share_link_add_to_cart",
  "share_link_remove_from_cart",
  "share_link_checkout_started",
]);

type CreatePayload = {
  channel: Extract<OrderIntentChannel, "SHARE_LINK">;
  eventName: PublicAnalyticsEventName;
  shareLinkId: string;
  productBaseId?: string | null;
  orderIntentId?: string | null;
  sessionKey?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  referrer?: string | null;
  metadataJson?: Prisma.JsonObject | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: string) {
  return UUID_REGEX.test(value);
}

function parseChannel(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  return SUPPORTED_CHANNELS.has(value as OrderIntentChannel)
    ? (value as Extract<OrderIntentChannel, "SHARE_LINK">)
    : null;
}

function parseEventName(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  return SUPPORTED_EVENTS.has(value as PublicAnalyticsEventName)
    ? (value as PublicAnalyticsEventName)
    : null;
}

function parseOptionalNullableString(
  value: unknown,
  maxLength: number,
): string | null | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function parseOptionalUuid(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  return isUuid(normalized) ? normalized : undefined;
}

function parseMetadataJson(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!isPlainObject(value)) {
    return undefined;
  }

  return value as Prisma.JsonObject;
}

function parseCreatePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  const channel = parseChannel(body.channel);
  if (!channel) {
    return { error: jsonError(400, "validation_error", "Invalid channel") };
  }

  const eventName = parseEventName(body.eventName);
  if (!eventName) {
    return { error: jsonError(400, "validation_error", "Invalid eventName") };
  }

  const shareLinkId =
    typeof body.shareLinkId === "string" ? body.shareLinkId.trim() : "";
  if (!isUuid(shareLinkId)) {
    return { error: jsonError(400, "validation_error", "shareLinkId is required") };
  }

  const productBaseId = parseOptionalUuid(body.productBaseId);
  if (body.productBaseId !== undefined && productBaseId === undefined) {
    return { error: jsonError(400, "validation_error", "Invalid productBaseId") };
  }

  const orderIntentId = parseOptionalUuid(body.orderIntentId);
  if (body.orderIntentId !== undefined && orderIntentId === undefined) {
    return { error: jsonError(400, "validation_error", "Invalid orderIntentId") };
  }

  const metadataJson = parseMetadataJson(body.metadataJson);
  if (body.metadataJson !== undefined && metadataJson === undefined) {
    return { error: jsonError(400, "validation_error", "Invalid metadataJson") };
  }

  const sessionKey = parseOptionalNullableString(body.sessionKey, 128);
  const utmSource = parseOptionalNullableString(body.utmSource, 255);
  const utmMedium = parseOptionalNullableString(body.utmMedium, 255);
  const utmCampaign = parseOptionalNullableString(body.utmCampaign, 255);
  const utmContent = parseOptionalNullableString(body.utmContent, 255);
  const utmTerm = parseOptionalNullableString(body.utmTerm, 255);
  const referrer = parseOptionalNullableString(body.referrer, 1024);

  return {
    data: {
      channel,
      eventName,
      shareLinkId,
      productBaseId: productBaseId ?? null,
      orderIntentId: orderIntentId ?? null,
      sessionKey: sessionKey ?? null,
      utmSource: utmSource ?? null,
      utmMedium: utmMedium ?? null,
      utmCampaign: utmCampaign ?? null,
      utmContent: utmContent ?? null,
      utmTerm: utmTerm ?? null,
      referrer: referrer ?? null,
      metadataJson: metadataJson ?? null,
    } satisfies CreatePayload,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Invalid JSON payload");
  }

  const parsed = parseCreatePayload(body);
  if (parsed.error) {
    return parsed.error;
  }

  const shareLink = await prisma.shareLinkV2.findFirst({
    where: {
      id: parsed.data.shareLinkId,
      isRevoked: false,
    },
    select: {
      id: true,
      brandId: true,
      ownerUserId: true,
    },
  });

  if (!shareLink) {
    return jsonError(404, "not_found", "Share link not found");
  }

  const brand = await prisma.brand.findUnique({
    where: { id: shareLink.brandId },
    select: { isActive: true },
  });

  if (!brand?.isActive) {
    return jsonError(404, "not_found", "Share link not found");
  }

  return withBrand(shareLink.brandId, async (tx) => {
    if (parsed.data.orderIntentId) {
      const orderIntent = await tx.orderIntent.findFirst({
        where: {
          id: parsed.data.orderIntentId,
          brandId: shareLink.brandId,
          shareLinkId: shareLink.id,
        },
        select: {
          id: true,
        },
      });

      if (!orderIntent) {
        return jsonError(404, "not_found", "Order intent not found");
      }
    }

    if (parsed.data.productBaseId) {
      const productBase = await tx.productBaseV2.findFirst({
        where: {
          id: parsed.data.productBaseId,
          brandId: shareLink.brandId,
        },
        select: {
          id: true,
        },
      });

      if (!productBase) {
        return jsonError(404, "not_found", "Product not found");
      }
    }

    const event = await tx.analyticsEvent.create({
      data: {
        brandId: shareLink.brandId,
        shareLinkId: shareLink.id,
        ownerUserId: shareLink.ownerUserId,
        productBaseId: parsed.data.productBaseId,
        orderIntentId: parsed.data.orderIntentId,
        channel: parsed.data.channel,
        eventName: parsed.data.eventName,
        sessionKey: parsed.data.sessionKey,
        utmSource: parsed.data.utmSource,
        utmMedium: parsed.data.utmMedium,
        utmCampaign: parsed.data.utmCampaign,
        utmContent: parsed.data.utmContent,
        utmTerm: parsed.data.utmTerm,
        referrer: parsed.data.referrer,
        metadataJson: parsed.data.metadataJson ?? undefined,
      },
      select: {
        id: true,
      },
    });

    return Response.json(
      {
        ok: true,
        data: {
          id: event.id,
        },
      },
      { status: 201 },
    );
  });
}
