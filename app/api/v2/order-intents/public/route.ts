import { Prisma, type OrderIntentChannel } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  createStockReservationForOrderIntent,
  StockReservationError,
} from "@/lib/order-intents/stock-reservations";
import { upsertCustomerProfile } from "@/lib/customer-profiles/upsert-customer-profile";
import { resolveApplicableProgressiveDiscount } from "@/lib/pricing/progressive-discounts";
import { withBrand } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SUPPORTED_CHANNELS = new Set<OrderIntentChannel>(["SHARE_LINK"]);

type CreateItemPayload = {
  catalogId: string;
  productBaseId: string;
  quantity: number;
};

type CreatePayload = {
  channel: OrderIntentChannel;
  shareLinkId: string;
  items: CreateItemPayload[];
  customerName?: string | null;
  customerEmail?: string | null;
  customerWhatsapp?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: string) {
  return UUID_REGEX.test(value);
}

function normalizeOptionalNullableString(value: unknown) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalEmail(value: unknown) {
  if (value === null) {
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

function normalizeOptionalWhatsapp(value: unknown) {
  if (value === null) {
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

function parseChannel(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  return SUPPORTED_CHANNELS.has(value as OrderIntentChannel)
    ? (value as OrderIntentChannel)
    : null;
}

function parseItems(value: unknown) {
  if (!Array.isArray(value)) {
    return { error: jsonError(400, "validation_error", "items is required") };
  }

  if (value.length === 0) {
    return {
      error: jsonError(400, "validation_error", "items must include at least one product"),
    };
  }

  const items: CreateItemPayload[] = [];
  const seenKeys = new Set<string>();

  for (const item of value) {
    if (!isPlainObject(item)) {
      return { error: jsonError(400, "validation_error", "Invalid item payload") };
    }

    const catalogId =
      typeof item.catalogId === "string" ? item.catalogId.trim() : "";
    const productBaseId =
      typeof item.productBaseId === "string" ? item.productBaseId.trim() : "";
    const quantity =
      typeof item.quantity === "number" && Number.isInteger(item.quantity)
        ? item.quantity
        : NaN;

    if (!isUuid(catalogId) || !isUuid(productBaseId)) {
      return {
        error: jsonError(400, "validation_error", "items must reference valid catalog and product ids"),
      };
    }

    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 999) {
      return {
        error: jsonError(400, "validation_error", "items quantity must be between 1 and 999"),
      };
    }

    const key = `${catalogId}:${productBaseId}`;
    if (seenKeys.has(key)) {
      return {
        error: jsonError(400, "validation_error", "items must be unique by catalog and product"),
      };
    }

    seenKeys.add(key);
    items.push({
      catalogId,
      productBaseId,
      quantity,
    });
  }

  return { items };
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

  const parsedItems = parseItems(body.items);
  if (parsedItems.error) {
    return { error: parsedItems.error };
  }

  const customerEmail = normalizeOptionalEmail(body.customerEmail);
  if (body.customerEmail !== undefined && customerEmail === undefined) {
    return {
      error: jsonError(400, "validation_error", "customerEmail must be valid"),
    };
  }

  const customerWhatsapp = normalizeOptionalWhatsapp(body.customerWhatsapp);
  if (body.customerWhatsapp !== undefined && customerWhatsapp === undefined) {
    return {
      error: jsonError(400, "validation_error", "customerWhatsapp must be valid"),
    };
  }

  return {
    data: {
      channel,
      shareLinkId,
      items: parsedItems.items,
      customerName: normalizeOptionalNullableString(body.customerName) ?? null,
      customerEmail: customerEmail ?? null,
      customerWhatsapp: customerWhatsapp ?? null,
      paymentMethod: normalizeOptionalNullableString(body.paymentMethod) ?? null,
      notes: normalizeOptionalNullableString(body.notes) ?? null,
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
    include: {
      ownerUser: {
        select: {
          id: true,
          name: true,
          whatsappPhone: true,
        },
      },
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
    const shareLinkCatalogs = await tx.shareLinkCatalogV2.findMany({
      where: {
        brandId: shareLink.brandId,
        shareLinkId: shareLink.id,
      },
      include: {
        catalog: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const allowedCatalogIds = new Set(shareLinkCatalogs.map((item) => item.catalogId));
    const requestedCatalogIds = Array.from(
      new Set(parsed.data.items.map((item) => item.catalogId)),
    );

    for (const catalogId of requestedCatalogIds) {
      if (!allowedCatalogIds.has(catalogId)) {
        return jsonError(400, "validation_error", "Catalog does not belong to this share link");
      }
    }

    const requestedProductIds = Array.from(
      new Set(parsed.data.items.map((item) => item.productBaseId)),
    );

    const catalogItems = await tx.catalogItemV2.findMany({
      where: {
        brandId: shareLink.brandId,
        catalogId: { in: requestedCatalogIds },
        productBaseId: { in: requestedProductIds },
      },
      select: {
        catalogId: true,
        productBaseId: true,
        snapshot: {
          select: {
            name: true,
            code: true,
            price: true,
          },
        },
        productBase: {
          select: {
            name: true,
            sku: true,
            price: true,
            commercialInfoJson: true,
          },
        },
      },
    });

    const catalogNameById = new Map(
      shareLinkCatalogs.map((item) => [item.catalog.id, item.catalog.name] as const),
    );
    const catalogItemByKey = new Map(
      catalogItems.map((item) => [
        `${item.catalogId}:${item.productBaseId}`,
        item,
      ] as const),
    );

    let subtotal: Prisma.Decimal | null = null;
    let itemCount = 0;

    const nestedItems = parsed.data.items.map((item) => {
      const catalogItem = catalogItemByKey.get(
        `${item.catalogId}:${item.productBaseId}`,
      );

      if (!catalogItem) {
        throw new Error(`Missing catalog item for ${item.catalogId}:${item.productBaseId}`);
      }

      const baseUnitPrice =
        catalogItem.snapshot?.price ?? catalogItem.productBase?.price ?? null;
      const commercialInfo =
        catalogItem.productBase?.commercialInfoJson &&
        typeof catalogItem.productBase.commercialInfoJson === "object" &&
        !Array.isArray(catalogItem.productBase.commercialInfoJson)
          ? catalogItem.productBase.commercialInfoJson
          : null;
      const { appliedTier } = resolveApplicableProgressiveDiscount(
        commercialInfo?.progressiveDiscounts,
        item.quantity,
      );
      const unitPrice =
        baseUnitPrice !== null && appliedTier
          ? baseUnitPrice
              .mul(new Prisma.Decimal(100 - appliedTier.discountPercent))
              .div(100)
              .toDecimalPlaces(2)
          : baseUnitPrice;
      const lineTotal = unitPrice !== null ? unitPrice.mul(item.quantity) : null;
      if (lineTotal !== null) {
        subtotal = subtotal ? subtotal.add(lineTotal) : lineTotal;
      }
      itemCount += item.quantity;

      return {
        brandId: shareLink.brandId,
        catalogId: item.catalogId,
        productBaseId: item.productBaseId,
        productName:
          catalogItem.snapshot?.name ?? catalogItem.productBase?.name ?? "Produto",
        sku: catalogItem.snapshot?.code ?? catalogItem.productBase?.sku ?? null,
        catalogName: catalogNameById.get(item.catalogId) ?? null,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });

    const customerProfile = await upsertCustomerProfile(
      tx,
      shareLink.brandId,
      parsed.data,
    );

    const created = await tx.orderIntent.create({
      data: {
        brandId: shareLink.brandId,
        ownerUserId: shareLink.ownerUserId,
        shareLinkId: shareLink.id,
        channel: parsed.data.channel,
        customerProfileId: customerProfile?.id ?? null,
        customerName: parsed.data.customerName,
        customerEmail: parsed.data.customerEmail,
        customerWhatsapp: parsed.data.customerWhatsapp,
        paymentMethod: parsed.data.paymentMethod,
        notes: parsed.data.notes,
        sellerNameSnapshot: shareLink.ownerUser.name,
        sellerWhatsappSnapshot: shareLink.ownerUser.whatsappPhone,
        subtotal,
        itemCount,
        items: {
          create: nestedItems,
        },
      },
      select: {
        id: true,
        brandId: true,
        ownerUserId: true,
        shareLinkId: true,
        channel: true,
        status: true,
        customerProfileId: true,
        customerName: true,
        customerEmail: true,
        customerWhatsapp: true,
        paymentMethod: true,
        sellerNameSnapshot: true,
        sellerWhatsappSnapshot: true,
        subtotal: true,
        itemCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const reservation = await createStockReservationForOrderIntent(tx, {
      brandId: shareLink.brandId,
      orderIntentId: created.id,
      items: parsed.data.items.map((item) => ({
        productBaseId: item.productBaseId,
        quantity: item.quantity,
      })),
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          ...created,
          subtotal: created.subtotal ? created.subtotal.toNumber() : null,
          reservationStatus: reservation.status,
          reservationExpiresAt: reservation.expiresAt,
        },
      },
      { status: 201 },
    );
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message.startsWith("Missing catalog item")) {
      return jsonError(400, "validation_error", "Some cart items are no longer available in this share link");
    }

    if (error instanceof StockReservationError) {
      return jsonError(
        error.code === "insufficient_stock" ? 409 : 400,
        error.code,
        error.message,
      );
    }

    return jsonError(500, "order_intent_create_failed", "Could not create order intent");
  });
}
