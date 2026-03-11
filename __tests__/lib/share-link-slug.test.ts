import {
  buildShareLinkSlugCandidate,
  slugifyShareLinkName,
} from "@/lib/share-links/slug";

describe("share link slug", () => {
  it("normalizes simple names", () => {
    expect(slugifyShareLinkName("Muriel")).toBe("muriel");
  });

  it("removes accents and extra separators", () => {
    expect(slugifyShareLinkName("  Catálogo   Fácil / Muriel  ")).toBe(
      "catalogo-facil-muriel",
    );
  });

  it("falls back when the source becomes empty", () => {
    expect(slugifyShareLinkName("%%%")).toBe("catalogo");
  });

  it("builds readable numeric suffixes for conflicts", () => {
    expect(buildShareLinkSlugCandidate("muriel", 1)).toBe("muriel");
    expect(buildShareLinkSlugCandidate("muriel", 2)).toBe("muriel-2");
    expect(buildShareLinkSlugCandidate("muriel", 3)).toBe("muriel-3");
  });
});
