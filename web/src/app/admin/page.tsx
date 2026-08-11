import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [totalProducts, published, unpublished, pendingOrders] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { published: true } }),
    prisma.product.count({ where: { published: false } }),
    prisma.order.count({ where: { status: "PENDING" } }),
  ]);

  const stats = [
    { label: "Total products", value: totalProducts },
    { label: "Published (live)", value: published },
    { label: "Unpublished / needs review", value: unpublished },
    { label: "Pending orders", value: pendingOrders },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Dashboard</h1>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-2xl font-semibold text-neutral-900">{s.value}</div>
            <div className="text-sm text-neutral-500">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        <Link
          href="/admin/products"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Manage products
        </Link>
        <Link
          href="/admin/orders"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          View orders
        </Link>
      </div>
    </div>
  );
}
