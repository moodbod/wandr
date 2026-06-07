export function parseExperiencePriceSnapshot(price?: string) {
  const match = price?.replace(/,/g, '').match(/\d+(\.\d+)?/);
  if (!match) {
    return undefined;
  }

  const value = Number(match[0]);
  return Number.isFinite(value) ? value : undefined;
}
