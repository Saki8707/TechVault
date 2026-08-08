import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Samo admin može da briše emoji." }, { status: 403 });
  }

  const { id } = await params;
  await prisma.customEmoji.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
