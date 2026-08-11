import Image from "next/image";
import Link from "next/link";
import { getCartLines } from "@/lib/cart";
import { updateCartQuantityAction, removeFromCartAction } from "./actions";
import { CheckoutButton } from "./CheckoutButton";

export default async function CartPage() {
  const lines = await getCartLines();
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const hasUnavailable = lines.some((l) => l.requestedQuantity > l.availableQuantity);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Your cart</h1>

      {lines.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 p-8 text-center text-neutral-500">
          Your cart is empty.{" "}
          <Link href="/products" className="text-neutral-900 underline">
            Browse products
          </Link>
        </div>
      ) : (
        <>
          {hasUnavailable && (
            <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Some quantities were reduced to match current availability.
            </p>
          )}
          <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
            {lines.map((line) => {
              const updateQuantity = updateCartQuantityAction.bind(null, line.productId);
              const remove = removeFromCartAction.bind(null, line.productId);
              return (
                <div key={line.productId} className="flex items-center gap-4 p-4">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-neutral-100">
                    {line.imageUrl && (
                      <Image
                        src={line.imageUrl}
                        alt={line.name}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <Link href={`/products/${line.slug}`} className="font-medium text-neutral-900 hover:underline">
                      {line.name}
                    </Link>
                    <p className="text-sm text-neutral-500">${line.unitPrice.toFixed(2)} each</p>
                  </div>
                  <form action={updateQuantity} className="flex items-center gap-2">
                    <input
                      type="number"
                      name="quantity"
                      min={0}
                      max={line.availableQuantity}
                      defaultValue={line.quantity}
                      className="w-16 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100"
                    >
                      Update
                    </button>
                  </form>
                  <p className="w-20 text-right text-sm font-medium text-neutral-900">
                    ${line.lineTotal.toFixed(2)}
                  </p>
                  <form action={remove}>
                    <button type="submit" className="text-sm text-red-600 hover:underline">
                      Remove
                    </button>
                  </form>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-xs space-y-3">
              <div className="flex justify-between text-lg font-semibold text-neutral-900">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-neutral-500">
                Shipping/pickup and any applicable tax are calculated at checkout.
              </p>
              <CheckoutButton />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
