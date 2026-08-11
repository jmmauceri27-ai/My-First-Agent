import Link from "next/link";
import { getCartCount } from "@/lib/cart";
import { SITE_NAME } from "@/lib/site";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const cartCount = await getCartCount();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-neutral-900">
            {SITE_NAME}
          </Link>
          <nav className="flex items-center gap-6 text-sm text-neutral-600">
            <Link href="/products" className="hover:text-neutral-900">
              All products
            </Link>
            <Link href="/products?category=WINDOW" className="hover:text-neutral-900">
              Windows
            </Link>
            <Link href="/products?category=DOOR" className="hover:text-neutral-900">
              Doors
            </Link>
            <Link href="/cart" className="relative font-medium text-neutral-900">
              Cart
              {cartCount > 0 && (
                <span className="ml-1 rounded-full bg-neutral-900 px-2 py-0.5 text-xs text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-neutral-200 py-8 text-center text-sm text-neutral-500">
        {SITE_NAME} &middot; All items sold as-is, subject to availability.
      </footer>
    </div>
  );
}
