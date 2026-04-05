import { PrismaClient } from "@prisma/client";

const RESERVATION_WINDOW_HOURS = 2;

export class StockReservationError extends Error {
  constructor(
    public readonly code:
      | "insufficient_stock"
      | "reservation_missing"
      | "reservation_expired"
      | "stock_inconsistent",
    message: string,
  ) {
    super(message);
    this.name = "StockReservationError";
  }
}

type ReservationQuantitySource = {
  productBaseId: string;
  quantity: number;
};

export function calculateReservationExpiresAt(now = new Date()) {
  return new Date(now.getTime() + RESERVATION_WINDOW_HOURS * 60 * 60 * 1000);
}

export function aggregateReservationQuantities(items: ReservationQuantitySource[]) {
  const quantityByProductId = new Map<string, number>();

  for (const item of items) {
    quantityByProductId.set(
      item.productBaseId,
      (quantityByProductId.get(item.productBaseId) ?? 0) + item.quantity,
    );
  }

  return Array.from(quantityByProductId.entries()).map(
    ([productBaseId, quantity]) => ({
      productBaseId,
      quantity,
    }),
  );
}

export async function expireStaleStockReservations(
  tx: PrismaClient,
  brandId: string,
  now = new Date(),
) {
  const staleReservations = await tx.stockReservation.findMany({
    where: {
      brandId,
      status: "ACTIVE",
      expiresAt: {
        lte: now,
      },
    },
    select: {
      id: true,
      orderIntentId: true,
    },
  });

  if (staleReservations.length === 0) {
    return { reservationIds: [] as string[], orderIntentIds: [] as string[] };
  }

  const reservationIds = staleReservations.map((item) => item.id);
  const orderIntentIds = staleReservations.map((item) => item.orderIntentId);

  await tx.stockReservation.updateMany({
    where: {
      id: {
        in: reservationIds,
      },
    },
    data: {
      status: "EXPIRED",
      releasedAt: now,
    },
  });

  await tx.orderIntent.updateMany({
    where: {
      id: {
        in: orderIntentIds,
      },
      status: "OPEN",
    },
    data: {
      status: "EXPIRED",
      expiredAt: now,
    },
  });

  return { reservationIds, orderIntentIds };
}

export async function createStockReservationForOrderIntent(
  tx: PrismaClient,
  params: {
    brandId: string;
    orderIntentId: string;
    items: ReservationQuantitySource[];
    now?: Date;
  },
) {
  const now = params.now ?? new Date();
  await expireStaleStockReservations(tx, params.brandId, now);

  const aggregatedItems = aggregateReservationQuantities(params.items);
  const productIds = aggregatedItems.map((item) => item.productBaseId);

  const [products, activeReservationItems] = await Promise.all([
    tx.productBaseV2.findMany({
      where: {
        brandId: params.brandId,
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
    }),
    tx.stockReservationItem.findMany({
      where: {
        brandId: params.brandId,
        productBaseId: {
          in: productIds,
        },
        stockReservation: {
          status: "ACTIVE",
          expiresAt: {
            gt: now,
          },
        },
      },
      select: {
        productBaseId: true,
        quantity: true,
      },
    }),
  ]);

  const productById = new Map(products.map((product) => [product.id, product] as const));
  const reservedByProductId = new Map<string, number>();

  for (const item of activeReservationItems) {
    reservedByProductId.set(
      item.productBaseId,
      (reservedByProductId.get(item.productBaseId) ?? 0) + item.quantity,
    );
  }

  for (const item of aggregatedItems) {
    const product = productById.get(item.productBaseId);
    if (!product) {
      throw new StockReservationError(
        "insufficient_stock",
        "Um ou mais produtos não estão mais disponíveis para reserva.",
      );
    }

    if (product.stockQuantity === null) {
      continue;
    }

    const reservedQuantity = reservedByProductId.get(item.productBaseId) ?? 0;
    const availableQuantity = product.stockQuantity - reservedQuantity;
    if (availableQuantity < item.quantity) {
      const label = product.name?.trim() || product.sku?.trim() || "produto";
      throw new StockReservationError(
        "insufficient_stock",
        `Estoque insuficiente para ${label}. Atualize o carrinho e tente novamente.`,
      );
    }
  }

  return tx.stockReservation.create({
    data: {
      brandId: params.brandId,
      orderIntentId: params.orderIntentId,
      status: "ACTIVE",
      reservedAt: now,
      expiresAt: calculateReservationExpiresAt(now),
      items: {
        create: aggregatedItems.map((item) => ({
          brandId: params.brandId,
          productBaseId: item.productBaseId,
          quantity: item.quantity,
        })),
      },
    },
    select: {
      id: true,
      status: true,
      reservedAt: true,
      expiresAt: true,
    },
  });
}

export async function resolveOrderIntentStockQuantities(
  tx: PrismaClient,
  params: {
    brandId: string;
    orderIntentId: string;
    now?: Date;
  },
) {
  const now = params.now ?? new Date();
  await expireStaleStockReservations(tx, params.brandId, now);

  const orderIntent = await tx.orderIntent.findFirst({
    where: {
      id: params.orderIntentId,
      brandId: params.brandId,
    },
    include: {
      items: {
        select: {
          productBaseId: true,
          quantity: true,
        },
      },
      stockReservation: {
        include: {
          items: {
            select: {
              productBaseId: true,
              quantity: true,
            },
          },
        },
      },
    },
  });

  if (!orderIntent) {
    throw new StockReservationError(
      "reservation_missing",
      "Pedido não encontrado para movimentação de estoque.",
    );
  }

  if (
    orderIntent.stockReservation &&
    orderIntent.stockReservation.status !== "ACTIVE"
  ) {
    if (orderIntent.stockReservation.status === "EXPIRED") {
      throw new StockReservationError(
        "reservation_expired",
        "A reserva desse pedido expirou. Gere uma nova intenção para continuar.",
      );
    }

    if (orderIntent.stockReservation.status === "CANCELED") {
      throw new StockReservationError(
        "reservation_missing",
        "A reserva desse pedido foi cancelada e não pode mais ser faturada.",
      );
    }
  }

  return {
    orderIntent,
    items: aggregateReservationQuantities(
      orderIntent.stockReservation?.items.length
        ? orderIntent.stockReservation.items
        : orderIntent.items,
    ),
  };
}
