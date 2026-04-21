export function normalizeCnpj(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

export function isValidCnpj(value: string | null | undefined) {
  const normalized = normalizeCnpj(value);
  return normalized === null || normalized.length === 14;
}

export function formatCnpj(value: string | null | undefined) {
  const normalized = normalizeCnpj(value);
  if (!normalized || normalized.length !== 14) {
    return normalized;
  }

  return normalized.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

export function cnpjMatches(
  expected: string | null | undefined,
  received: string | null | undefined,
) {
  const normalizedExpected = normalizeCnpj(expected);
  const normalizedReceived = normalizeCnpj(received);

  return Boolean(
    normalizedExpected &&
      normalizedReceived &&
      normalizedExpected === normalizedReceived,
  );
}
