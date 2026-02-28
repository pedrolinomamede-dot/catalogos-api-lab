import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
  log: ["error", "warn"],
});

const DEV_ADMIN_EMAIL = "admin@ipe.local";
const DEV_ADMIN_PASSWORD = "Admin@1234";

const buildImageUrl = (sku: string, variantIndex: number, imageIndex: number) =>
  `https://example.com/images/${sku}-v${variantIndex + 1}-${imageIndex + 1}.webp`;

const buildThumbUrl = (sku: string, variantIndex: number, imageIndex: number) =>
  `https://example.com/images/${sku}-v${variantIndex + 1}-${imageIndex + 1}-thumb.webp`;

async function main() {
  await prisma.brand.deleteMany({ where: { slug: "ipe-distribuidora" } });

  const brand = await prisma.brand.create({
    data: {
      name: "Ipe Distribuidora",
      slug: "ipe-distribuidora",
      logoUrl: "https://example.com/brands/ipe.png",
    },
  });

  const passwordHash = await bcrypt.hash(DEV_ADMIN_PASSWORD, 12);

  await prisma.user.create({
    data: {
      brandId: brand.id,
      name: "Admin",
      email: DEV_ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
    },
  });

  const [beverages, hygiene, foods] = await Promise.all([
    prisma.category.create({
      data: {
        brandId: brand.id,
        name: "Bebidas",
        icon: "droplet",
        color: "#3B82F6",
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brand.id,
        name: "Higiene",
        icon: "sparkles",
        color: "#10B981",
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        brandId: brand.id,
        name: "Alimentos",
        icon: "utensils",
        color: "#F59E0B",
        sortOrder: 3,
      },
    }),
  ]);

  const products = [
    {
      sku: "0001",
      name: "Agua Mineral 500ml",
      description: "Garrafa 500ml.",
      categoryId: beverages.id,
      variations: [
        {
          variantType: "size",
          variantValue: "500ml",
          price: 1.99,
          stockQuantity: 120,
          images: 1,
        },
      ],
    },
    {
      sku: "0002",
      name: "Suco Laranja 1L",
      description: "Suco integral 1L.",
      categoryId: beverages.id,
      variations: [
        {
          variantType: "size",
          variantValue: "1L",
          price: 8.99,
          stockQuantity: 50,
          images: 1,
        },
        {
          variantType: "tipo",
          variantValue: "Zero",
          price: 9.29,
          stockQuantity: 30,
          images: 1,
        },
      ],
    },
    {
      sku: "0003",
      name: "Refrigerante Cola 2L",
      description: "Garrafa 2L.",
      categoryId: beverages.id,
      variations: [
        {
          variantType: "size",
          variantValue: "2L",
          price: 10.99,
          stockQuantity: 60,
          images: 1,
        },
      ],
    },
    {
      sku: "0004",
      name: "Arroz Tipo 1 5kg",
      description: "Pacote 5kg.",
      categoryId: foods.id,
      variations: [
        {
          variantType: "peso",
          variantValue: "5kg",
          price: 24.99,
          stockQuantity: 40,
          images: 1,
        },
      ],
    },
    {
      sku: "0005",
      name: "Feijao Carioca 1kg",
      description: "Pacote 1kg.",
      categoryId: foods.id,
      variations: [
        {
          variantType: "peso",
          variantValue: "1kg",
          price: 9.99,
          stockQuantity: 80,
          images: 1,
        },
      ],
    },
    {
      sku: "0006",
      name: "Macarrao Espaguete 500g",
      description: "Pacote 500g.",
      categoryId: foods.id,
      variations: [
        {
          variantType: "peso",
          variantValue: "500g",
          price: 6.99,
          stockQuantity: 100,
          images: 1,
        },
      ],
    },
    {
      sku: "0007",
      name: "Sabonete Neutro 90g",
      description: "Unidade 90g.",
      categoryId: hygiene.id,
      variations: [
        {
          variantType: "pack",
          variantValue: "Unitario",
          price: 1.99,
          stockQuantity: 200,
          images: 1,
        },
        {
          variantType: "pack",
          variantValue: "Pack 4",
          price: 6.99,
          stockQuantity: 50,
          images: 1,
        },
      ],
    },
    {
      sku: "0008",
      name: "Shampoo Uso Diario 300ml",
      description: "Frasco 300ml.",
      categoryId: hygiene.id,
      variations: [
        {
          variantType: "size",
          variantValue: "300ml",
          price: 15.99,
          stockQuantity: 35,
          images: 1,
        },
      ],
    },
    {
      sku: "0009",
      name: "Detergente Neutro 500ml",
      description: "Frasco 500ml.",
      categoryId: hygiene.id,
      variations: [
        {
          variantType: "size",
          variantValue: "500ml",
          price: 3.99,
          stockQuantity: 90,
          images: 1,
        },
      ],
    },
    {
      sku: "0010",
      name: "Cafe Torrado 500g",
      description: "Pacote 500g.",
      categoryId: foods.id,
      variations: [
        {
          variantType: "peso",
          variantValue: "500g",
          price: 13.99,
          stockQuantity: 60,
          images: 1,
        },
      ],
    },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: {
        brandId: brand.id,
        categoryId: product.categoryId,
        sku: product.sku,
        name: product.name,
        description: product.description,
        variations: {
          create: product.variations.map((variation, variationIndex) => ({
            brandId: brand.id,
            variantType: variation.variantType,
            variantValue: variation.variantValue,
            price: variation.price,
            stockQuantity: variation.stockQuantity,
            images: {
              create: Array.from(
                { length: variation.images },
                (_, imageIndex) => ({
                  brandId: brand.id,
                  imageUrl: buildImageUrl(
                    product.sku,
                    variationIndex,
                    imageIndex,
                  ),
                  thumbnailUrl: buildThumbUrl(
                    product.sku,
                    variationIndex,
                    imageIndex,
                  ),
                  altText: `${product.name} ${variation.variantValue ?? ""}`.trim(),
                  sortOrder: imageIndex,
                }),
              ),
            },
          })),
        },
      },
    });
  }

  console.log(`Seeded ${products.length} products for brand ${brand.slug}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
