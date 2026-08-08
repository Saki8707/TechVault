import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const emoji = await prisma.customEmoji.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, url: true },
  });
  return NextResponse.json({ emoji });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Samo admin može da dodaje emoji." }, { status: 403 });
  }

  const { name, url } = await req.json();
  const trimmedName = typeof name === "string" ? name.trim().toLowerCase().replace(/\s+/g, "-") : "";
  if (!trimmedName || typeof url !== "string" || !url) {
    return NextResponse.json({ error: "Ime i slika su obavezni." }, { status: 400 });
  }

  const existing = await prisma.customEmoji.findUnique({ where: { name: trimmedName } });
  if (existing) {
    return NextResponse.json({ error: "Emoji sa tim imenom već postoji." }, { status: 400 });
  }

  const emoji = await prisma.customEmoji.create({
    data: { name: trimmedName, url, uploadedById: session.user.id },
    select: { id: true, name: true, url: true },
  });
  return NextResponse.json(emoji);
}
