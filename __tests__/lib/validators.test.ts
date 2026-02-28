import {
  productCreateSchema,
  variationCreateSchema,
} from "@/lib/validators/product";
import { createCategorySchema } from "@/lib/validators/category";
import { brandCreateSchema } from "@/lib/validators/brand";

describe("validators", () => {
  it("accepts a valid product payload", () => {
    const result = productCreateSchema.safeParse({
      sku: "1234",
      name: "Produto Valido",
      description: "Descricao",
      variations: [
        {
          variantType: "size",
          variantValue: "250ml",
          price: 4.98,
          stockQuantity: 10,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects SKU with wrong length", () => {
    const result = productCreateSchema.safeParse({
      sku: "123",
      name: "Produto Valido",
    });

    expect(result.success).toBe(false);
  });

  it("rejects product name starting with #", () => {
    const result = productCreateSchema.safeParse({
      sku: "1234",
      name: "#Produto Ignorado",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid category color", () => {
    const result = createCategorySchema.safeParse({
      name: "Categoria",
      color: "blue",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid variation payload", () => {
    const result = variationCreateSchema.safeParse({
      variantType: "size",
      variantValue: "500ml",
      price: 9.9,
      stockQuantity: 5,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid brand slug", () => {
    const result = brandCreateSchema.safeParse({
      name: "Marca Teste",
      slug: "Slug Invalido",
    });

    expect(result.success).toBe(false);
  });
});
