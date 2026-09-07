"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, hashPassword } from "@/lib/auth";

export async function login(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const sitePassword = process.env.SITE_PASSWORD;

  if (!sitePassword || password !== sitePassword) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const hash = await hashPassword(sitePassword);
  cookies().set(AUTH_COOKIE, hash, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  redirect(next || "/");
}
