import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import {
  expireStaleStockReservations,
  resolveOrderIntentStockQuantities,
  StockReservationError,
} from "@/lib/order-intents/stock-reservations";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

type UpdatePayload = {
  status: "BILLED" | "CANCELED";
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUpdatePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  if (body.status !== "BILLED" && body.status !== "CANCELED") {
    return {
      error: jsonError(400, "validation_error", "Invalid target status"),
    };
  }

  return {
    data: {
      status: body.status,
    } satisfies UpdatePayload,
  };
}

function serializeOrderIntent(
  item: Prisma.OrderIntentGetPayload<{
    include: {
      shareLink: {
        select: {
          name: true;
          slug: true;
        };
      };
      stockReservation: {
        select: {
          status: true;
          expiresAt: true;
        };
      };
    };
  }>,
) {
  const { shareLink, stockReservation, subtotal, ...orderIntent } = item;

  return {
    ...orderIntent,
    subtotal: subtotal ? subtotal.toNumber() : null,
    shareLinkName: shareLink?.name ?? null,
    shareLinkSlug: shareLink?.slug ?? null,
    reservationStatus: stockReservation?.status ?? null,
    reservationExpiresAt: stockReservation?.expiresAt ?? null,
  };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Invalid JSON payload");
  }

  const parsed = parseUpdatePayload(body);
  if (parsed.error) {
    return parsed.error;
  }

  return withBrand(auth.brandId, async (tx) => {
    await expireStaleStockReservations(tx, auth.brandId);

    const existing = await tx.orderIntent.findFirst({
      where: {
        id,
        brandId: auth.brandId,
      },
      include: {
        shareLink: {
          select: {
            name: true,
            slug: true,
          },
        },
        stockReservation: {
          select: {
            id: true,
            status: true,
            expiresAt: true,
          },
        },
      },
    });

    if (!existing) {
      return jsonError(404, "not_found", "Order intent not found");
    }

    if (existing.status === parsed.data.status) {
      return NextResponse.json({
        ok: true,
        data: serializeOrderIntent(existing),
      });
    }

    if (existing.status !== "OPEN") {
      return jsonError(
        409,
        "invalid_status_transition",
        "Only open intents can be updated",
      );
    }

    const now = new Date();
    try {
      if (parsed.data.status === "BILLED") {
        const { orderIntent, items } = await resolveOrderIntentStockQuantities(tx, {
          brandId: auth.brandId,
          orderIntentId: existing.id,
          now,
        });

        const productIds = items.map((item) => item.productBaseId);
        const products = await tx.productBaseV2.findMany({
          where: {
            brandId: auth.brandId,
            id: {
              in: productIds,
            },
          },
          select: {
            id: true,
            name: true,
            sku: true,
            stockQuantity: true,
          },
        });

        const productById = new Map(products.map((product) => [product.id, product] as const));

        for (const item of items) {
          const product = productById.get(item.productBaseId);
          if (!product) {
            throw new StockReservationError(
              "stock_inconsistent",
              "Um ou mais produtos desse pedido não foram encontrados para baixa de estoque.",
            );
          }

          if (product.stockQuantity === null) {
            continue;
          }

          if (product.stockQuantity < item.quantity) {
            const label = product.name?.trim() || product.sku?.trim() || "produto";
            throw new StockReservationError(
              "stock_inconsistent",
              `Estoque inconsistente para ${label}. Revise a reserva antes de faturar.`,
            );
          }
        }

        for (const item of items) {
          const product = productById.get(item.productBaseId);
          if (!product || product.stockQuantity === null) {
            continue;
          }

          await tx.productBaseV2.update({
            where: {
              id: product.id,
            },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }

        if (orderIntent.stockReservation?.status === "ACTIVE") {
          await tx.stockReservation.update({
            where: {
              id: orderIntent.stockReservation.id,
            },
            data: {
              status: "CONVERTED",
              convertedAt: now,
              releasedAt: now,
            },
          });
        }
      } else if (existing.stockReservation?.status === "ACTIVE") {
        await tx.stockReservation.update({
          where: {
            id: existing.stockReservation.id,
          },
          data: {
            status: "CANCELED",
            releasedAt: now,
          },
        });
      }
    } catch (error) {
      if (error instanceof StockReservationError) {
        return jsonError(
          error.code === "insufficient_stock" ||
            error.code === "reservation_expired" ||
            error.code === "stock_inconsistent"
            ? 409
            : 400,
          error.code,
          error.message,
        );
      }

      throw error;
    }

    const updated = await tx.orderIntent.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        billedAt: parsed.data.status === "BILLED" ? now : null,
        canceledAt: parsed.data.status === "CANCELED" ? now : null,
      },
      include: {
        shareLink: {
          select: {
            name: true,
            slug: true,
          },
        },
        stockReservation: {
          select: {
            status: true,
            expiresAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      data: serializeOrderIntent(updated),
    });
  });
}
