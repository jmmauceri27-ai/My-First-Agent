import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { ProductCard } from "@/components/ProductCard";

const CATEGORY_TILES = [
  { category: "WINDOW", label: "Windows" },
  { category: "DOOR", label: "Doors" },
  { category: "SCREEN", label: "Screens" },
  { category: "ACCESSORY", label: "Accessories" },
];

export default async function HomePage() {
  const products = await prisma.product.findMany({
    where: { published: true, quantity: { gt: 0 } },
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div>
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-neutral-900 sm:text-4xl">{SITE_NAME}</h1>
          <p className="mx-auto mt-3 max-w-xl text-neutral-600">{SITE_TAGLINE}</p>
          <Link
            href="/products"
            className="mt-6 inline-block rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Shop all inventory
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {CATEGORY_TILES.map((c) => (
            <Link
              key={c.category}
              href={`/products?category=${c.category}`}
              className="rounded-lg border border-neutral-200 p-6 text-center font-medium text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="mb-4 text-xl font-semibold text-neutral-900">Recently listed</h2>
        {products.length === 0 ? (
          <p className="text-neutral-500">
            No products are published yet. Check back soon, or if you&apos;re the site admin, head to{" "}
            <Link href="/admin/products" className="underline">
              /admin/products
            </Link>{" "}
            to publish inventory.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} imageUrl={p.images[0]?.url ?? null} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
