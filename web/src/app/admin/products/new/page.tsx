import { ProductForm } from "../ProductForm";
import { createProduct } from "../actions";

export default function NewProductPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">New product</h1>
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <ProductForm action={createProduct} />
      </div>
    </div>
  );
}
