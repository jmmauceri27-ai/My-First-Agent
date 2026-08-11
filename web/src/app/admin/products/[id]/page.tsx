import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "../ProductForm";
import { ConfirmButton } from "../ConfirmButton";
import { updateProduct, deleteProduct, addProductImage, deleteProductImage } from "../actions";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      addOns: true,
      parent: true,
    },
  });

  if (!product) notFound();

  const updateWithId = updateProduct.bind(null, id);
  const deleteWithId = deleteProduct.bind(null, id);
  const addImageWithId = addProductImage.bind(null, id);

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{product.name}</h1>
          <p className="font-mono text-xs text-neutral-500">{product.sku}</p>
        </div>
        <ConfirmButton
          action={deleteWithId}
          confirmMessage={`Delete "${product.name}"? This cannot be undone.`}
          label="Delete product"
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        />
      </div>

      {product.parent && (
        <p className="mb-4 text-sm text-neutral-600">
          Add-on for:{" "}
          <Link href={`/admin/products/${product.parent.id}`} className="underline">
            {product.parent.name}
          </Link>
        </p>
      )}

      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Photos
        </h2>
        <div className="mb-4 flex flex-wrap gap-3">
          {product.images.map((image) => {
            const deleteImage = deleteProductImage.bind(null, image.id);
            return (
              <div key={image.id} className="relative">
                <Image
                  src={image.url}
                  alt={product.name}
                  width={120}
                  height={120}
                  className="h-28 w-28 rounded-md border border-neutral-200 object-cover"
                />
                <ConfirmButton
                  action={deleteImage}
                  confirmMessage="Remove this photo?"
                  label="✕"
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs text-red-600 shadow ring-1 ring-neutral-200 hover:bg-red-50"
                />
              </div>
            );
          })}
          {product.images.length === 0 && (
            <p className="text-sm text-neutral-500">No photos yet.</p>
          )}
        </div>
        <form action={addImageWithId} className="flex items-center gap-3">
          <input
            type="file"
            name="file"
            accept="image/*"
            required
            className="text-sm"
          />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100"
          >
            Upload photo
          </button>
        </form>
      </div>

      {product.addOns.length > 0 && (
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Add-ons (screens / parts linked to this item)
          </h2>
          <ul className="space-y-2 text-sm">
            {product.addOns.map((addOn) => (
              <li key={addOn.id} className="flex items-center justify-between">
                <span>{addOn.name}</span>
                <Link href={`/admin/products/${addOn.id}`} className="text-neutral-500 hover:underline">
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <ProductForm product={product} action={updateWithId} />
      </div>
    </div>
  );
}
