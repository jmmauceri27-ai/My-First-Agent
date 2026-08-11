import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const CART_COOKIE = "cart";

export interface CartEntry {
  productId: string;
  quantity: number;
}

async function readCart(): Promise<CartEntry[]> {
  const store = await cookies();
  const raw = store.get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is CartEntry =>
        e && typeof e.productId === "string" && typeof e.quantity === "number" && e.quantity > 0
    );
  } catch {
    return [];
  }
}

async function writeCart(entries: CartEntry[]) {
  const store = await cookies();
  if (entries.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, JSON.stringify(entries), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function addToCart(productId: string, quantity: number) {
  const cart = await readCart();
  const existing = cart.find((e) => e.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ productId, quantity });
  }
  await writeCart(cart);
}

export async function updateCartQuantity(productId: string, quantity: number) {
  const cart = await readCart();
  const next = cart
    .map((e) => (e.productId === productId ? { ...e, quantity } : e))
    .filter((e) => e.quantity > 0);
  await writeCart(next);
}

export async function removeFromCart(productId: string) {
  const cart = await readCart();
  await writeCart(cart.filter((e) => e.productId !== productId));
}

export async function clearCart() {
  await writeCart([]);
}

export interface CartLine {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  unitPrice: number;
  requestedQuantity: number;
  availableQuantity: number;
  quantity: number; // clamped to availability
  lineTotal: number;
}

export async function getCartLines(): Promise<CartLine[]> {
  const cart = await readCart();
  if (cart.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: cart.map((e) => e.productId) } },
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
  });

  const lines: CartLine[] = [];
  for (const entry of cart) {
    const product = products.find((p) => p.id === entry.productId);
    if (!product || !product.published || !product.price) continue;

    const quantity = Math.min(entry.quantity, product.quantity);
    if (quantity <= 0) continue;

    const unitPrice = Number(product.price);
    lines.push({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: product.images[0]?.url ?? null,
      unitPrice,
      requestedQuantity: entry.quantity,
      availableQuantity: product.quantity,
      quantity,
      lineTotal: Math.round(unitPrice * quantity * 100) / 100,
    });
  }
  return lines;
}

export async function getCartCount(): Promise<number> {
  const cart = await readCart();
  return cart.reduce((sum, e) => sum + e.quantity, 0);
}
