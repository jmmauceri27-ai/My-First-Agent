import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addToCartAction } from "../../cart/actions";

const SPEC_LABELS: Record<string, string> = {
  callSize: "Size / call code",
  exteriorColor: "Exterior color",
  interiorColor: "Interior color",
  handing: "Handing",
  option1: "Glazing / hardware",
  option2: "Options",
  option3: "Glass",
  jambDepth: "Jamb depth",
  miscNotes: "Notes",
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      addOns: { include: { images: { take: 1 } } },
    },
  });

  if (!product || !product.published) notFound();

  const specs = (
    ["callSize", "exteriorColor", "interiorColor", "handing", "option1", "option2", "option3", "jambDepth", "miscNotes"] as const
  )
    .map((key) => ({ label: SPEC_LABELS[key], value: product[key] }))
    .filter((s) => s.value);

  const addToCart = addToCartAction.bind(null, product.id);
  const inStock = product.quantity > 0 && product.price !== null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-4 text-sm text-neutral-500">
        <Link href="/products" className="hover:underline">
          All products
        </Link>{" "}
        / <span className="text-neutral-700">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <div className="aspect-square w-full overflow-hidden rounded-lg bg-neutral-100">
            {product.images[0] ? (
              <Image
                src={product.images[0].url}
                alt={product.name}
                width={700}
                height={700}
                className="h-full w-full object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-400">
                No photo yet
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.slice(1).map((img) => (
                <div key={img.id} className="aspect-square overflow-hidden rounded-md bg-neutral-100">
                  <Image
                    src={img.url}
                    alt={product.name}
                    width={140}
                    height={140}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-500">{product.category.replace("_", " ")}</p>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{product.name}</h1>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {product.price ? `$${Number(product.price).toFixed(2)}` : "Price on request"}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {product.quantity > 0 ? `${product.quantity} available` : "Out of stock"}
          </p>

          {product.description && (
            <p className="mt-4 whitespace-pre-line text-neutral-700">{product.description}</p>
          )}

          {inStock ? (
            <form action={addToCart} className="mt-6 flex items-center gap-3">
              <input
                type="number"
                name="quantity"
                min={1}
                max={product.quantity}
                defaultValue={1}
                className="w-20 rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Add to cart
              </button>
            </form>
          ) : (
            <button
              disabled
              className="mt-6 cursor-not-allowed rounded-md bg-neutral-200 px-6 py-2.5 text-sm font-medium text-neutral-500"
            >
              {product.price === null ? "Contact us for pricing" : "Sold out"}
            </button>
          )}

          {specs.length > 0 && (
            <div className="mt-8 border-t border-neutral-200 pt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Specifications
              </h2>
              <dl className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2">
                {specs.map((s) => (
                  <div key={s.label} className="flex gap-2">
                    <dt className="text-neutral-500">{s.label}:</dt>
                    <dd className="text-neutral-800">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {product.addOns.length > 0 && (
            <div className="mt-8 border-t border-neutral-200 pt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Available add-ons
              </h2>
              <div className="space-y-2">
                {product.addOns
                  .filter((a) => a.published)
                  .map((addOn) => (
                    <Link
                      key={addOn.id}
                      href={`/products/${addOn.slug}`}
                      className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm hover:border-neutral-400"
                    >
                      <span>{addOn.name}</span>
                      <span className="text-neutral-500">
                        {addOn.price ? `$${Number(addOn.price).toFixed(2)}` : "—"}
                      </span>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
