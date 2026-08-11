import Link from "next/link";
import { clearCart } from "@/lib/cart";

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  if (params.session_id) {
    await clearCart();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">Thank you for your order!</h1>
      <p className="mt-3 text-neutral-600">
        We&apos;ve received your order and will follow up by email with confirmation and next steps
        (pickup, delivery, or shipping details).
      </p>
      <Link
        href="/products"
        className="mt-6 inline-block rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Continue shopping
      </Link>
    </div>
  );
}
