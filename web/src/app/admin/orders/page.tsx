import { prisma } from "@/lib/prisma";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Orders ({orders.length})</h1>
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Items</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2 text-neutral-600">{o.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-2 text-neutral-900">
                  {o.customerName ?? o.customerEmail}
                  <div className="text-xs text-neutral-500">{o.customerEmail}</div>
                </td>
                <td className="px-4 py-2 text-neutral-600">{o.items.length}</td>
                <td className="px-4 py-2 text-neutral-600">${Number(o.total).toFixed(2)}</td>
                <td className="px-4 py-2 text-neutral-600">{o.status}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
