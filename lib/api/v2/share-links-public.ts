import type { ShareLinkPublicV2 } from "@/types/api";

import { apiGet } from "@/lib/api/client";

type ApiEnvelope<T> = {
  ok: true;
  data: T;
};

export async function getShareLinkByTokenV2(
  identifier: string,
): Promise<ShareLinkPublicV2> {
  const res = await apiGet<ApiEnvelope<ShareLinkPublicV2>>(
    `/api/v2/share-links/by-token/${identifier}`,
  );
  return res.data;
}
