import { ProductCategory } from "@/generated/prisma/client";

/**
 * Best-effort category guess from the free-text product name used in the
 * manufacturer order sheets. Admin can always correct this in the UI.
 */
export function categorizeProductName(rawName: string): ProductCategory {
  const n = rawName.trim().toUpperCase();

  if (!n || n === "NA") return ProductCategory.OTHER;
  if (n.includes("SCREEN")) return ProductCategory.SCREEN;
  if (n.includes("SKYLIGHT")) return ProductCategory.SKYLIGHT;
  if (n.includes("SLAB")) return ProductCategory.DOOR_SLAB;
  if (n.includes("DOOR")) return ProductCategory.DOOR;
  // French/patio door model codes: ELSFD, ELIFD, ELOFD, CUIFD, SPD, etc.
  if (n.includes("FD") || n.includes("SPD")) return ProductCategory.DOOR;
  if (
    n.includes("SIGN HOLDER") ||
    n.includes("ASTRAGAL") ||
    n.includes("CASING")
  ) {
    return ProductCategory.ACCESSORY;
  }
  if (n.includes("SASH")) return ProductCategory.ACCESSORY;

  return ProductCategory.WINDOW;
}
