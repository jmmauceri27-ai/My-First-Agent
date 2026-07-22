import { NextResponse } from "next/server";

// Login is temporarily disabled: the app runs on the Supabase service-role
// key (see src/lib/dal.ts and src/lib/supabase/admin.ts) instead of a
// per-request session, so the site is intentionally open to anyone with the
// URL. To re-enable the login gate, restore the body below to:
//   import { updateSession } from "@/lib/supabase/proxy";
//   import type { NextRequest } from "next/server";
//   export function proxy(request: NextRequest) {
//     return updateSession(request);
//   }
// and switch dal.ts back to the cookie-based server client with real auth
// checks (see git history on this file / dal.ts for the previous version).
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
