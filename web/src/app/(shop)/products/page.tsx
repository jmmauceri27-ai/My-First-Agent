import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCategory, Prisma } from "@/generated/prisma/client";
import { ProductCard } from "@/components/ProductCard";

const PAGE_SIZE = 24;

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  WINDOW: "Windows",
  DOOR: "Doors",
  DOOR_SLAB: "Door slabs",
  SCREEN: "Screens",
  SKYLIGHT: "Skylights",
  ACCESSORY: "Accessories",
  OTHER: "Other",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.ProductWhereInput = {
    published: true,
    quantity: { gt: 0 },
  };
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { exteriorColor: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.category && params.category in ProductCategory) {
    where.category = params.category as ProductCategory;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">
        {params.category && params.category in ProductCategory
          ? CATEGORY_LABELS[params.category as ProductCategory]
          : "All products"}{" "}
        <span className="text-base font-normal text-neutral-500">({total})</span>
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form className="flex gap-2">
          <input type="hidden" name="category" value={params.category ?? ""} />
          <input
            type="text"
            name="q"
            defaultValue={params.q}
            placeholder="Search products"
            className="w-56 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
          >
            Search
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/products"
            className={`rounded-full px-3 py-1 text-sm ${
              !params.category ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-600"
            }`}
          >
            All
          </Link>
          {Object.values(ProductCategory).map((c) => (
            <Link
              key={c}
              href={`/products?category=${c}`}
              className={`rounded-full px-3 py-1 text-sm ${
                params.category === c ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-600"
              }`}
            >
              {CATEGORY_LABELS[c]}
            </Link>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-neutral-500">No products match your search.</p>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} imageUrl={p.images[0]?.url ?? null} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/products?${new URLSearchParams({
                ...(params.q ? { q: params.q } : {}),
                ...(params.category ? { category: params.category } : {}),
                page: String(p),
              }).toString()}`}
              className={`rounded-md px-3 py-1 ${
                p === page ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-600"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
