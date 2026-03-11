import { parseCatalogSnapshotAttributes } from "@/lib/catalog-snapshots/snapshot-types";

describe("catalog snapshot attributes", () => {
  it("reads line and size from snapshot attributes", () => {
    expect(
      parseCatalogSnapshotAttributes({
        line: "Baby",
        size: "100ml",
      }),
    ).toEqual({
      imageLayout: null,
      line: "Baby",
      size: "100ml",
    });
  });

  it("falls back to null for unsupported values", () => {
    expect(
      parseCatalogSnapshotAttributes({
        line: 123,
        size: false,
      }),
    ).toEqual({
      imageLayout: null,
      line: null,
      size: null,
    });
  });
});
