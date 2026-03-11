import { normalizeProductImageLayout, resolveProductImageLayout } from "@/lib/catalog/image-layout";

describe("image layout", () => {
  it("normalizes manual layout values inside bounds", () => {
    expect(
      normalizeProductImageLayout({
        zoom: 9,
        offsetX: 80,
        offsetY: -80,
        trimApplied: true,
      }),
    ).toEqual({
      zoom: 1.45,
      offsetX: 30,
      offsetY: -30,
      trimApplied: true,
    });
  });

  it("combines size-based scale with manual zoom and offsets", () => {
    const result = resolveProductImageLayout("250ml", {
      zoom: 1.1,
      offsetX: 10,
      offsetY: -5,
    });

    expect(result.scale).toBeCloseTo(0.99, 5);
    expect(result.offsetX).toBe(10);
    expect(result.offsetY).toBe(-5);
    expect(result.trimApplied).toBe(false);
  });
});
