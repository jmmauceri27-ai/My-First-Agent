"use server";

import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { getCartLines } from "@/lib/cart";

export async function createCheckoutSession() {
  const lines = await getCartLines();
  if (lines.length === 0) {
    redirect("/cart");
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    shipping_address_collection: { allowed_countries: ["US"] },
    line_items: lines.map((line) => ({
      quantity: line.quantity,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(line.unitPrice * 100),
        product_data: {
          name: line.name,
          images: line.imageUrl ? [line.imageUrl] : undefined,
          metadata: { productId: line.productId },
        },
      },
    })),
    success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  redirect(session.url);
}
