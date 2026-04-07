import { type OrderIntentChannel, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { upsertCustomerProfile } from "@/lib/customer-profiles/upsert-customer-profile";
import { withBrand } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";
import type { CreatePublicProductRequestRequest } from "@/types/api";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SUPPORTED_CHANNELS = new Set<OrderIntentChannel>(["SHARE_LINK"]);

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

function parseRequiredString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function parseOptionalEmail(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const email = value.trim().toLowerCase();
  if (email.length === 0) {
    return null;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

function parseOptionalPhone(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) {
    return null;
  }

  return digits.length >= 10 && digits.length <= 15 ? digits : undefined;
}

function parseOptionalQuantityHint(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    return undefined;
  }

  return value >= 1 && value <= 999 ? value : undefined;
}

function parseCreatePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  const channel = parseChannel(body.channel);
  if (!channel) {
    return { error: jsonError(400, "validation_error", "Invalid channel") };
  }

  const shareLinkId =
    typeof body.shareLinkId === "string" ? body.shareLinkId.trim() : "";
  if (!isUuid(shareLinkId)) {
    return { error: jsonError(400, "validation_error", "shareLinkId is required") };
  }

  const requestText = parseRequiredString(body.requestText, 2000);
  if (!requestText) {
    return { error: jsonError(400, "validation_error", "requestText is required") };
  }

  const quantityHint = parseOptionalQuantityHint(body.quantityHint);
  if (body.quantityHint !== undefined && quantityHint === undefined) {
    return {
      error: jsonError(400, "validation_error", "quantityHint must be between 1 and 999"),
    };
  }

  const contactEmail = parseOptionalEmail(body.contactEmail);
  if (body.contactEmail !== undefined && contactEmail === undefined) {
    return {
      error: jsonError(400, "validation_error", "contactEmail must be valid"),
    };
  }

  const contactPhone = parseOptionalPhone(body.contactPhone);
  if (body.contactPhone !== undefined && contactPhone === undefined) {
    return {
      error: jsonError(400, "validation_error", "contactPhone must be valid"),
    };
  }

  return {
    data: {
      channel,
      shareLinkId,
      requestText,
      categoryHint: parseOptionalNullableString(body.categoryHint, 255) ?? null,
      quantityHint: quantityHint ?? null,
      city: parseOptionalNullableString(body.city, 255) ?? null,
      state: parseOptionalNullableString(body.state, 120) ?? null,
      contactName: parseOptionalNullableString(body.contactName, 255) ?? null,
      contactPhone: contactPhone ?? null,
      contactEmail: contactEmail ?? null,
      sessionKey: parseOptionalNullableString(body.sessionKey, 128) ?? null,
      utmSource: parseOptionalNullableString(body.utmSource, 255) ?? null,
      utmMedium: parseOptionalNullableString(body.utmMedium, 255) ?? null,
      utmCampaign: parseOptionalNullableString(body.utmCampaign, 255) ?? null,
      utmContent: parseOptionalNullableString(body.utmContent, 255) ?? null,
      utmTerm: parseOptionalNullableString(body.utmTerm, 255) ?? null,
      referrer: parseOptionalNullableString(body.referrer, 1024) ?? null,
    } satisfies CreatePublicProductRequestRequest,
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

  return withBrand(shareLink.brandId, async (tx) => {
    const customerProfile = await upsertCustomerProfile(tx, shareLink.brandId, {
      customerName: parsed.data.contactName,
      customerEmail: parsed.data.contactEmail,
      customerWhatsapp: parsed.data.contactPhone,
    });

    const created = await tx.productRequest.create({
      data: {
        brandId: shareLink.brandId,
        ownerUserId: shareLink.ownerUserId,
        shareLinkId: shareLink.id,
        customerProfileId: customerProfile?.id ?? null,
        channel: parsed.data.channel,
        requestText: parsed.data.requestText,
        categoryHint: parsed.data.categoryHint,
        quantityHint: parsed.data.quantityHint,
        city: parsed.data.city,
        state: parsed.data.state,
        contactName: parsed.data.contactName,
        contactPhone: parsed.data.contactPhone,
        contactEmail: parsed.data.contactEmail,
      },
      select: {
        id: true,
        status: true,
      },
    });

    await tx.analyticsEvent.create({
      data: {
        brandId: shareLink.brandId,
        shareLinkId: shareLink.id,
        ownerUserId: shareLink.ownerUserId,
        channel: parsed.data.channel,
        eventName: "product_request_created",
        sessionKey: parsed.data.sessionKey,
        utmSource: parsed.data.utmSource,
        utmMedium: parsed.data.utmMedium,
        utmCampaign: parsed.data.utmCampaign,
        utmContent: parsed.data.utmContent,
        utmTerm: parsed.data.utmTerm,
        referrer: parsed.data.referrer,
        metadataJson: {
          productRequestId: created.id,
          categoryHint: parsed.data.categoryHint,
          quantityHint: parsed.data.quantityHint,
          hasContact:
            Boolean(parsed.data.contactName) ||
            Boolean(parsed.data.contactPhone) ||
            Boolean(parsed.data.contactEmail),
        } satisfies Prisma.JsonObject,
      },
    });

    return NextResponse.json({
      ok: true,
      data: created,
    });
  });
}
