import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/generated/prisma/client";

export function ProductCard({
  product,
  imageUrl,
}: {
  product: Pick<Product, "slug" | "name" | "price" | "category" | "exteriorColor">;
  imageUrl: string | null;
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-lg border border-neutral-200 hover:border-neutral-400"
    >
      <div className="aspect-square w-full bg-neutral-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            width={400}
            height={400}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            No photo yet
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium text-neutral-900">{product.name}</p>
        <p className="text-xs text-neutral-500">
          {product.category}
          {product.exteriorColor ? ` · ${product.exteriorColor}` : ""}
        </p>
        <p className="mt-1 text-sm font-semibold text-neutral-900">
          {product.price ? `$${Number(product.price).toFixed(2)}` : "Price on request"}
        </p>
      </div>
    </Link>
  );
}
