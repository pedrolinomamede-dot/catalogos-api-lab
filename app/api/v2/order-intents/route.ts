import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { type AuthContext, requireRoles } from "@/lib/authz";
import { expireStaleStockReservations } from "@/lib/order-intents/stock-reservations";
import { withBrand } from "@/lib/prisma";
import { parsePagination } from "@/lib/utils/pagination";

function buildOrderIntentWhere(
  auth: AuthContext,
): Prisma.OrderIntentWhereInput {
  if (auth.role === "SELLER") {
    return {
      brandId: auth.brandId,
      ownerUserId: auth.userId,
    };
  }

  return {
    brandId: auth.brandId,
  };
}

function serializeOrderIntentListItem(
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

export async function GET(request: Request) {
  const auth = await requireRoles(["ADMIN", "SELLER"]);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const { take, skip, page, pageSize } = parsePagination(searchParams, {
    defaultPageSize: 50,
    maxPageSize: 100,
  });

  const where = buildOrderIntentWhere(auth);

  return withBrand(auth.brandId, async (tx) => {
    await expireStaleStockReservations(tx, auth.brandId);

    const [items, total] = await Promise.all([
      tx.orderIntent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
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
      }),
      tx.orderIntent.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: items.map(serializeOrderIntentListItem),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  });
}
