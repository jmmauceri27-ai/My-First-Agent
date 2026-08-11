export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function sanitizeSkuPart(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 20);
}

export function randomSkuSuffix(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
