import {
  resolveProductImageScale,
  resolveProductImageSizeBand,
} from "@/lib/catalog/image-size-band";

describe("image size band", () => {
  it("classifies small products up to 100", () => {
    expect(resolveProductImageSizeBand("100ml")).toBe("small");
    expect(resolveProductImageSizeBand("100g")).toBe("small");
    expect(resolveProductImageScale("100ml")).toBe(0.82);
  });

  it("classifies medium products from 100 to 500", () => {
    expect(resolveProductImageSizeBand("250ml")).toBe("medium");
    expect(resolveProductImageSizeBand("500g")).toBe("medium");
    expect(resolveProductImageScale("250ml")).toBe(0.9);
  });

  it("classifies large products above 500", () => {
    expect(resolveProductImageSizeBand("750ml")).toBe("large");
    expect(resolveProductImageSizeBand("1l")).toBe("large");
    expect(resolveProductImageScale("750ml")).toBe(0.98);
  });

  it("falls back to default for unknown sizes", () => {
    expect(resolveProductImageSizeBand("kit")).toBe("default");
    expect(resolveProductImageScale("kit")).toBe(0.9);
  });
});
