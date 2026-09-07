import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { importPlayersFromCsv } from "@/lib/importPlayers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const sitePassword = process.env.SITE_PASSWORD;
  if (sitePassword) {
    const provided = request.headers.get("x-import-key");
    if (provided !== sitePassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const csv = await request.text();
  const result = await importPlayersFromCsv(csv);

  revalidatePath("/players");
  revalidatePath("/board");
  revalidatePath("/draft");
  revalidatePath("/");

  return NextResponse.json(result);
}
