import { createCheckoutSession } from "./checkout-action";

export function CheckoutButton() {
  return (
    <form action={createCheckoutSession}>
      <button
        type="submit"
        className="w-full rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Checkout
      </button>
    </form>
  );
}
