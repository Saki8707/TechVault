import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STORAGE_DIR = path.join(process.cwd(), "storage", "support");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const { messageId } = await params;
  const message = await prisma.supportMessage.findUnique({
    where: { id: messageId },
    include: { ticket: { select: { userId: true } } },
  });
  if (!message || !message.attachmentPath) {
    return NextResponse.json({ error: "Prilog nije pronađen." }, { status: 404 });
  }

  const isOwner = message.ticket.userId === session.user.id;
  if (session.user.role !== "ADMIN" && !isOwner) {
    return NextResponse.json({ error: "Nemate pristup." }, { status: 403 });
  }

  try {
    const buffer = await readFile(path.join(STORAGE_DIR, message.attachmentPath));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": message.attachmentMimeType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          message.attachmentFilename ?? "prilog",
        )}`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fajl nije pronađen na disku." }, { status: 404 });
  }
}
