const FALLBACK_SLUG = "catalogo";
const MAX_SLUG_LENGTH = 80;

function trimDashes(value: string) {
  return value.replace(/^-+|-+$/g, "");
}

export function slugifyShareLinkName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-");

  const trimmed = trimDashes(normalized).slice(0, MAX_SLUG_LENGTH);
  const safe = trimDashes(trimmed);
  return safe || FALLBACK_SLUG;
}

export function buildShareLinkSlugCandidate(baseSlug: string, sequence: number) {
  if (sequence <= 1) {
    return baseSlug;
  }

  const suffix = `-${sequence}`;
  const maxBaseLength = Math.max(1, MAX_SLUG_LENGTH - suffix.length);
  const trimmedBase = trimDashes(baseSlug.slice(0, maxBaseLength)) || FALLBACK_SLUG;
  return `${trimmedBase}${suffix}`;
}
