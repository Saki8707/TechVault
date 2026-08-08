import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const tags = await prisma.tag.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: q ? { name: "asc" } : { createdAt: "desc" },
    take: 10,
    select: { id: true, name: true },
  });

  return NextResponse.json({ tags });
}
