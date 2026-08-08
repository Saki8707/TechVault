import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logSearch } from "@/lib/search";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query : "";
  if (!query.trim()) {
    return NextResponse.json({ error: "Nedostaje upit." }, { status: 400 });
  }

  await logSearch(session.user.id, query);
  return NextResponse.json({ ok: true });
}
