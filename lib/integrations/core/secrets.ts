import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

import type { IntegrationStatePayload } from "@/lib/integrations/core/types";

function toBase64Url(value: Buffer | string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function getIntegrationSecret() {
  const raw =
    process.env.INTEGRATIONS_SECRET_KEY?.trim() || process.env.NEXTAUTH_SECRET?.trim();

  if (!raw) {
    throw new Error("Integration secret is not configured");
  }

  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(value: string) {
  const key = getIntegrationSecret();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    toBase64Url(iv),
    toBase64Url(tag),
    toBase64Url(encrypted),
  ].join(".");
}

export function decryptSecret(payload: string | null | undefined) {
  if (!payload) {
    return null;
  }

  const [ivRaw, tagRaw, encryptedRaw] = payload.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Invalid encrypted secret payload");
  }

  const key = getIntegrationSecret();
  const iv = fromBase64Url(ivRaw);
  const tag = fromBase64Url(tagRaw);
  const encrypted = fromBase64Url(encryptedRaw);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function createSignedIntegrationState(payload: IntegrationStatePayload) {
  const body = toBase64Url(JSON.stringify(payload));
  const signature = toBase64Url(
    createHmac("sha256", getIntegrationSecret()).update(body).digest(),
  );

  return `${body}.${signature}`;
}

export function verifySignedIntegrationState(token: string) {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    throw new Error("Invalid integration state");
  }

  const expected = toBase64Url(
    createHmac("sha256", getIntegrationSecret()).update(body).digest(),
  );

  if (expected !== signature) {
    throw new Error("Invalid integration state signature");
  }

  const parsed = JSON.parse(fromBase64Url(body).toString("utf8")) as IntegrationStatePayload;
  if (!parsed.brandId || !parsed.provider || !parsed.issuedAt) {
    throw new Error("Invalid integration state payload");
  }

  return parsed;
}
