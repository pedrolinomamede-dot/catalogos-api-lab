import type { AppUserV2, CreateUserV2Request, UpdateUserV2Request } from "@/types/api";

import { apiGet, apiPatch, apiPost } from "@/lib/api/client";

type ApiEnvelope<T> = {
  ok: true;
  data: T;
};

export async function listUsersV2(): Promise<AppUserV2[]> {
  const res = await apiGet<ApiEnvelope<AppUserV2[]>>("/api/v2/users");
  return res.data;
}

export async function createUserV2(
  body: CreateUserV2Request,
): Promise<AppUserV2> {
  const res = await apiPost<CreateUserV2Request, ApiEnvelope<AppUserV2>>(
    "/api/v2/users",
    body,
  );
  return res.data;
}

export async function updateUserV2(
  id: string,
  body: UpdateUserV2Request,
): Promise<AppUserV2> {
  const res = await apiPatch<UpdateUserV2Request, ApiEnvelope<AppUserV2>>(
    `/api/v2/users/${id}`,
    body,
  );
  return res.data;
}
