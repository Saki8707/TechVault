import { NextRequest, NextResponse } from "next/server";
import { readFile, unlink } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canWriteSection, canReadSection } from "@/lib/permissions";

const STORAGE_DIR = path.join(process.cwd(), "storage", "attachments");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { article: { select: { sectionId: true } } },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Prilog nije pronađen." }, { status: 404 });
  }

  const canRead = await canReadSection(
    { id: session.user.id, role: session.user.role },
    attachment.article.sectionId,
  );
  if (!canRead) {
    return NextResponse.json({ error: "Nemate pristup." }, { status: 403 });
  }

  try {
    const buffer = await readFile(path.join(STORAGE_DIR, attachment.path));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fajl nije pronađen na disku." }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { article: { select: { sectionId: true } } },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Prilog nije pronađen." }, { status: 404 });
  }

  const allowed = await canWriteSection(
    { id: session.user.id, role: session.user.role },
    attachment.article.sectionId,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Nemate dozvolu." }, { status: 403 });
  }

  await prisma.attachment.delete({ where: { id } });
  try {
    await unlink(path.join(STORAGE_DIR, attachment.path));
  } catch {
    // fajl vec ne postoji na disku - nastavi bez greske
  }

  return NextResponse.json({ ok: true });
}
