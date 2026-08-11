import { ProductCategory, type Product } from "@/generated/prisma/client";

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  WINDOW: "Window",
  DOOR: "Door",
  DOOR_SLAB: "Door slab",
  SCREEN: "Screen",
  SKYLIGHT: "Skylight",
  ACCESSORY: "Accessory",
  OTHER: "Other",
};

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  step,
  min,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  step?: string;
  min?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-neutral-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        min={min}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
      />
    </div>
  );
}

export function ProductForm({
  product,
  action,
}: {
  product?: Product | null;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Listing
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-neutral-700">
              Product name
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={product?.name ?? ""}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="category" className="mb-1 block text-sm font-medium text-neutral-700">
              Category
            </label>
            <select
              id="category"
              name="category"
              defaultValue={product?.category ?? ProductCategory.OTHER}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              {Object.values(ProductCategory).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2 pb-2">
            <input
              id="published"
              name="published"
              type="checkbox"
              defaultChecked={product?.published ?? false}
              className="h-4 w-4"
            />
            <label htmlFor="published" className="text-sm font-medium text-neutral-700">
              Published (visible on storefront)
            </label>
          </div>
          <Field
            label="Price (USD)"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.price ? Number(product.price) : ""}
          />
          <Field
            label="Quantity available"
            name="quantity"
            type="number"
            step="1"
            min="0"
            defaultValue={product?.quantity ?? 1}
          />
          <div className="sm:col-span-2">
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-neutral-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={product?.description ?? ""}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Spec sheet (from manufacturer order)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="PO / order #" name="poNumber" defaultValue={product?.poNumber} />
          <Field label="Job / call #" name="jobNumber" defaultValue={product?.jobNumber} />
          <Field label="Call size (e.g. CN 3672)" name="callSize" defaultValue={product?.callSize} />
          <Field label="Exterior color" name="exteriorColor" defaultValue={product?.exteriorColor} />
          <Field label="Interior color" name="interiorColor" defaultValue={product?.interiorColor} />
          <Field label="Handing" name="handing" defaultValue={product?.handing} />
          <Field label="Option 1 (glazing/hardware)" name="option1" defaultValue={product?.option1} />
          <Field label="Option 2" name="option2" defaultValue={product?.option2} />
          <Field label="Option 3" name="option3" defaultValue={product?.option3} />
          <Field label="Jamb depth" name="jambDepth" defaultValue={product?.jambDepth} />
          <div className="sm:col-span-2">
            <label htmlFor="miscNotes" className="mb-1 block text-sm font-medium text-neutral-700">
              Misc notes
            </label>
            <input
              id="miscNotes"
              name="miscNotes"
              defaultValue={product?.miscNotes ?? ""}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        {product ? "Save changes" : "Create product"}
      </button>
    </form>
  );
}
