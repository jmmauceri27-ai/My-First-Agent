import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid signature: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const existing = await prisma.order.findUnique({ where: { stripeSessionId: session.id } });
  if (existing) return; // already processed (webhook retry)

  const stripe = getStripe();
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ["data.price.product"],
  });

  const items = lineItems.data
    .map((item) => {
      const product = item.price?.product as Stripe.Product | undefined;
      const productId = product?.metadata?.productId;
      if (!productId) return null;
      return {
        productId,
        quantity: item.quantity ?? 1,
        unitPrice: (item.price?.unit_amount ?? 0) / 100,
      };
    })
    .filter((i): i is { productId: string; quantity: number; unitPrice: number } => i !== null);

  if (items.length === 0) return;

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const total = (session.amount_total ?? 0) / 100;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        stripeSessionId: session.id,
        status: "PAID",
        customerEmail: session.customer_details?.email ?? "unknown@example.com",
        customerName: session.customer_details?.name ?? null,
        shippingAddress: session.customer_details?.address
          ? JSON.parse(JSON.stringify(session.customer_details.address))
          : undefined,
        subtotal,
        total,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
    });

    for (const item of items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;
      const newQuantity = Math.max(0, product.quantity - item.quantity);
      await tx.product.update({
        where: { id: item.productId },
        data: {
          quantity: newQuantity,
          published: newQuantity > 0 ? product.published : false,
        },
      });
    }

    return order;
  });
}
