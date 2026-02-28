import type { ApiError } from "@/types/api";

export type ApiFetchError = {
  status: number;
  message: string;
  payload?: unknown;
};

const isApiErrorPayload = (payload: unknown): payload is ApiError => {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const record = payload as { ok?: unknown; error?: { message?: unknown } };
  return record.ok === false && typeof record.error?.message === "string";
};

const resolveErrorMessage = (payload: unknown, fallback: string) => {
  if (isApiErrorPayload(payload)) {
    return payload.error.message;
  }
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }
  return fallback;
};

const isFormData = (body: RequestInit["body"]) =>
  typeof FormData !== "undefined" && body instanceof FormData;

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const body = init.body;
  if (body && !isFormData(body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (res.ok) {
    if (res.status === 204 || res.status === 205) {
      return undefined as T;
    }
    if (isJson) {
      try {
        return (await res.json()) as T;
      } catch {
        return undefined as T;
      }
    }
    const text = await res.text();
    return text ? (text as unknown as T) : (undefined as T);
  }

  let payload: unknown = undefined;
  if (isJson) {
    try {
      payload = await res.json();
    } catch {
      payload = undefined;
    }
  } else {
    try {
      const text = await res.text();
      if (text) {
        payload = text;
      }
    } catch {
      payload = undefined;
    }
  }

  const error: ApiFetchError = {
    status: res.status,
    message: resolveErrorMessage(payload, res.statusText || "Request failed"),
    payload,
  };
  throw error;
}

export function withQuery(
  path: string,
  params: Record<string, string | number | boolean | undefined | null>,
) {
  const url = new URL(path, "http://localhost");
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  const isAbsolute = /^[a-zA-Z][a-zA-Z\\d+.-]*:/.test(path);
  return isAbsolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
}

export function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
) {
  const url = params ? withQuery(path, params) : path;
  return apiFetch<T>(url, { method: "GET" });
}

export function apiPost<TBody, TResp>(path: string, body: TBody) {
  const payloadBody = body as RequestInit["body"];
  const payload = isFormData(payloadBody) ? payloadBody : JSON.stringify(body);
  return apiFetch<TResp>(path, { method: "POST", body: payload });
}

export function apiPatch<TBody, TResp>(path: string, body: TBody) {
  const payloadBody = body as RequestInit["body"];
  const payload = isFormData(payloadBody) ? payloadBody : JSON.stringify(body);
  return apiFetch<TResp>(path, { method: "PATCH", body: payload });
}

export function apiDelete<TResp>(path: string) {
  return apiFetch<TResp>(path, { method: "DELETE" });
}
