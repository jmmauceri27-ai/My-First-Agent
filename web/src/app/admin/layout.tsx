import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    return <>{children}</>;
  }

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-neutral-900">Admin</span>
            <nav className="flex gap-4 text-sm text-neutral-600">
              <Link href="/admin/products" className="hover:text-neutral-900">
                Products
              </Link>
              <Link href="/admin/orders" className="hover:text-neutral-900">
                Orders
              </Link>
              <Link href="/" className="hover:text-neutral-900">
                View storefront
              </Link>
            </nav>
          </div>
          <form action={logout}>
            <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
              Sign out ({session.user?.email})
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
