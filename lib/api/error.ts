import type { ApiError } from "@/types/api";

import type { ApiFetchError } from "./client";

type ErrorMessage = { title: string; description?: string };
const HTML_MARKUP_REGEX = /<!doctype html|<html[\s>]/i;

const isApiError = (payload: unknown): payload is ApiError => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const record = payload as {
    ok?: unknown;
    error?: { code?: unknown; message?: unknown };
  };
  return (
    record.ok === false &&
    typeof record.error?.code === "string" &&
    typeof record.error?.message === "string"
  );
};

const isApiFetchError = (err: unknown): err is ApiFetchError => {
  if (!err || typeof err !== "object") {
    return false;
  }

  const record = err as { status?: unknown; message?: unknown };
  return typeof record.status === "number" && typeof record.message === "string";
};

const readMessageLike = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  if (!("message" in value)) {
    return null;
  }

  const message = (value as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
};

const hasHtmlContent = (value: unknown) => {
  const message = readMessageLike(value);
  if (!message) {
    return false;
  }
  return HTML_MARKUP_REGEX.test(message);
};

function mapApiError(apiError: ApiError): ErrorMessage {
  if (apiError.error.code === "schema_migration_required") {
    return {
      title: "Banco desatualizado no servidor. Aplique as migrations e tente novamente.",
    };
  }

  return { title: apiError.error.message };
}

function mapApiFetchError(error: ApiFetchError): ErrorMessage {
  const htmlFromResponse = hasHtmlContent(error.message) || hasHtmlContent(error.payload);

  if (error.status === 404 && htmlFromResponse) {
    return {
      title: "Endpoint nao encontrado no servidor (404). Verifique versao/rotas da API.",
    };
  }

  if (htmlFromResponse) {
    return {
      title: "Resposta invalida do servidor. Tente novamente.",
    };
  }

  return { title: error.message };
}

export function getErrorMessage(err: unknown): ErrorMessage {
  if (isApiError(err)) {
    return mapApiError(err);
  }

  if (isApiFetchError(err)) {
    if (isApiError(err.payload)) {
      return mapApiError(err.payload);
    }
    return mapApiFetchError(err);
  }

  if (err instanceof Error) {
    return { title: err.message || "Something went wrong" };
  }

  if (typeof err === "string" && err.trim()) {
    return { title: err };
  }

  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return { title: message };
    }
  }

  return { title: "Something went wrong" };
}
