export function formatBRL(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const amount = safeValue;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatBRLFromCents(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return formatBRL(safeValue / 100);
}
