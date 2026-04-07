import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { type AuthContext, requireRoles } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { parsePagination } from "@/lib/utils/pagination";

function buildProductRequestWhere(
  auth: AuthContext,
): Prisma.ProductRequestWhereInput {
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

function serializeProductRequestListItem(
  item: Prisma.ProductRequestGetPayload<{
    include: {
      customerProfile: {
        select: {
          id: true;
          name: true;
          email: true;
          whatsapp: true;
        };
      };
      shareLink: {
        select: {
          name: true;
          slug: true;
        };
      };
      ownerUser: {
        select: {
          name: true;
          whatsappPhone: true;
        };
      };
    };
  }>,
) {
  const { customerProfile, shareLink, ownerUser, ...productRequest } = item;

  return {
    ...productRequest,
    customerProfileId: customerProfile?.id ?? null,
    customerProfileName: customerProfile?.name ?? null,
    customerProfileEmail: customerProfile?.email ?? null,
    customerProfileWhatsapp: customerProfile?.whatsapp ?? null,
    shareLinkName: shareLink?.name ?? null,
    shareLinkSlug: shareLink?.slug ?? null,
    ownerUserName: ownerUser?.name ?? null,
    ownerUserWhatsapp: ownerUser?.whatsappPhone ?? null,
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

  const where = buildProductRequestWhere(auth);

  return withBrand(auth.brandId, async (tx) => {
    const [items, total] = await Promise.all([
      tx.productRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: {
          customerProfile: {
            select: {
              id: true,
              name: true,
              email: true,
              whatsapp: true,
            },
          },
          shareLink: {
            select: {
              name: true,
              slug: true,
            },
          },
          ownerUser: {
            select: {
              name: true,
              whatsappPhone: true,
            },
          },
        },
      }),
      tx.productRequest.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: items.map(serializeProductRequestListItem),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  });
}
