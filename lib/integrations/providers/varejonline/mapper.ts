import type { NormalizedExternalProduct } from "@/lib/integrations/core/types";

export function mapVarejonlineProduct(payload: unknown): NormalizedExternalProduct {
  void payload;
  throw new Error(
    "Varejonline product mapping is not implemented. Public source only documents OAuth, not product payload shape.",
  );
}
