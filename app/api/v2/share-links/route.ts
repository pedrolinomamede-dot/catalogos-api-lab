import { Prisma, UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { type AuthContext, requireRoles, requireUser } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import {
  buildShareLinkSlugCandidate,
  slugifyShareLinkName,
} from "@/lib/share-links/slug";
import { jsonError } from "@/lib/utils/errors";
import { parsePagination } from "@/lib/utils/pagination";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TOKEN_BYTES = 24;

type CreatePayload = {
  name: string;
  catalogIds: string[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function isUuid(value: string) {
  return UUID_REGEX.test(value);
}

function parseName(value: unknown) {
  if (typeof value !== "string") {
    return { error: jsonError(400, "validation_error", "Name is required") };
  }

  const name = value.trim();
  if (name.length < 2) {
    return {
      error: jsonError(400, "validation_error", "Name must be at least 2 characters"),
    };
  }

  return { name };
}

function parseCatalogIds(value: unknown) {
  if (!Array.isArray(value)) {
    return { error: jsonError(400, "validation_error", "catalogIds is required") };
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (normalized.length === 0) {
    return {
      error: jsonError(400, "validation_error", "catalogIds must include at least one id"),
    };
  }

  for (const catalogId of normalized) {
    if (!isUuid(catalogId)) {
      return {
        error: jsonError(400, "validation_error", "catalogIds must be UUIDs"),
      };
    }
  }

  const uniqueIds = Array.from(new Set(normalized));
  if (uniqueIds.length !== normalized.length) {
    return {
      error: jsonError(400, "validation_error", "catalogIds must be unique"),
    };
  }

  return { catalogIds: uniqueIds };
}

function parseCreatePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  if (hasOwn(body, "brandId") || hasOwn(body, "tenantId")) {
    return { error: jsonError(400, "validation_error", "tenantId is not allowed") };
  }

  if (
    hasOwn(body, "token") ||
    hasOwn(body, "isRevoked") ||
    hasOwn(body, "revokedAt") ||
    hasOwn(body, "id")
  ) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  const parsedName = parseName(body.name);
  if (parsedName.error) {
    return { error: parsedName.error };
  }

  const parsedCatalogIds = parseCatalogIds(body.catalogIds);
  if (parsedCatalogIds.error) {
    return { error: parsedCatalogIds.error };
  }

  return {
    data: {
      name: parsedName.name,
      catalogIds: parsedCatalogIds.catalogIds,
    } satisfies CreatePayload,
  };
}

function generateToken() {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

async function createUniqueShareLinkSlug(
  tx: Prisma.TransactionClient,
  baseSlug: string,
) {
  for (let sequence = 1; sequence <= 200; sequence += 1) {
    const slug = buildShareLinkSlugCandidate(baseSlug, sequence);
    const conflict = await tx.shareLinkV2.findFirst({
      where: {
        OR: [{ slug }, { token: slug }],
      },
      select: { id: true },
    });

    if (!conflict) {
      return slug;
    }
  }

  throw new Error("Unable to generate a unique slug");
}

async function createShareLink(
  tx: Prisma.TransactionClient,
  brandId: string,
  name: string,
  ownerUserId: string,
) {
  const baseSlug = slugifyShareLinkName(name);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = generateToken();
    const slug = await createUniqueShareLinkSlug(tx, baseSlug);

    try {
      return await tx.shareLinkV2.create({
        data: {
          brandId,
          name,
          token,
          slug,
          ownerUserId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        if (attempt < 2) {
          continue;
        }
      }
      throw error;
    }
  }

  throw new Error("Unable to generate a unique token");
}

function buildShareLinkWhere(
  auth: AuthContext,
): Prisma.ShareLinkV2WhereInput {
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

function serializeShareLinkListItem(
  item: Prisma.ShareLinkV2GetPayload<{
    include: {
      ownerUser: {
        select: {
          name: true;
          email: true;
          whatsappPhone: true;
        };
      };
      _count: {
        select: {
          catalogs: true;
        };
      };
    };
  }>,
) {
  const { _count, ownerUser, ...shareLink } = item;

  return {
    ...shareLink,
    catalogCount: _count.catalogs,
    ownerName: ownerUser.name,
    ownerEmail: ownerUser.email,
    ownerWhatsappPhone: ownerUser.whatsappPhone,
  };
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const { take, skip, page, pageSize } = parsePagination(searchParams, {
    defaultPageSize: 50,
    maxPageSize: 100,
  });

  const where = buildShareLinkWhere(auth);

  return withBrand(auth.brandId, async (tx) => {
    const [items, total] = await Promise.all([
      tx.shareLinkV2.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
        include: {
          ownerUser: {
            select: {
              name: true,
              email: true,
              whatsappPhone: true,
            },
          },
          _count: {
            select: {
              catalogs: true,
            },
          },
        },
      }),
      tx.shareLinkV2.count({ where }),
    ]);

    const data = items.map(serializeShareLinkListItem);

    return NextResponse.json({
      ok: true,
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  });
}

export async function POST(request: Request) {
  const auth = await requireRoles(["ADMIN", "SELLER"] satisfies UserRole[]);
  if (auth instanceof NextResponse) {
    return auth;
  }

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

  try {
    return await withBrand(auth.brandId, async (tx) => {
      const catalogs = await tx.catalogV2.findMany({
        where: {
          id: { in: parsed.data.catalogIds },
          brandId: auth.brandId,
        },
        select: { id: true },
      });

      if (catalogs.length !== parsed.data.catalogIds.length) {
        return jsonError(404, "not_found", "Catalog not found");
      }

      const shareLink = await createShareLink(
        tx,
        auth.brandId,
        parsed.data.name,
        auth.userId,
      );

      await tx.shareLinkCatalogV2.createMany({
        data: parsed.data.catalogIds.map((catalogId) => ({
          brandId: auth.brandId,
          shareLinkId: shareLink.id,
          catalogId,
        })),
      });

      return NextResponse.json(
        {
          ok: true,
          data: {
            id: shareLink.id,
            token: shareLink.token,
            slug: shareLink.slug,
          },
        },
        { status: 201 },
      );
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "share_link_conflict", "Share link already exists");
    }
    return jsonError(500, "share_link_create_failed", "Could not create share link");
  }
}
