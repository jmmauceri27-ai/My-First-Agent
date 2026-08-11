"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as cart from "@/lib/cart";

export async function addToCartAction(productId: string, formData: FormData) {
  const quantity = Math.max(1, Number(formData.get("quantity")) || 1);
  await cart.addToCart(productId, quantity);
  revalidatePath("/cart");
  redirect("/cart");
}

export async function updateCartQuantityAction(productId: string, formData: FormData) {
  const quantity = Math.max(0, Number(formData.get("quantity")) || 0);
  await cart.updateCartQuantity(productId, quantity);
  revalidatePath("/cart");
}

export async function removeFromCartAction(productId: string) {
  await cart.removeFromCart(productId);
  revalidatePath("/cart");
}
