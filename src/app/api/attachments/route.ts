import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canWriteSection } from "@/lib/permissions";

const STORAGE_DIR = path.join(process.cwd(), "storage", "attachments");
const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const articleId = formData.get("articleId");
  const colorRaw = formData.get("color");

  if (!(file instanceof File) || typeof articleId !== "string") {
    return NextResponse.json({ error: "Nedostaju podaci." }, { status: 400 });
  }
  const color =
    typeof colorRaw === "string" && /^#[0-9a-fA-F]{6}$/.test(colorRaw) ? colorRaw : null;
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fajl je prevelik (max 25MB)." }, { status: 400 });
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { sectionId: true },
  });
  if (!article) {
    return NextResponse.json({ error: "Članak nije pronađen." }, { status: 404 });
  }

  const allowed = await canWriteSection(
    { id: session.user.id, role: session.user.role },
    article.sectionId,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Nemate dozvolu za ovu kategoriju." }, { status: 403 });
  }

  await mkdir(STORAGE_DIR, { recursive: true });

  const storedName = randomUUID();
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(STORAGE_DIR, storedName), buffer);

  const attachment = await prisma.attachment.create({
    data: {
      articleId,
      filename: file.name,
      path: storedName,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      color,
      uploadedById: session.user.id,
    },
  });

  return NextResponse.json({
    id: attachment.id,
    filename: attachment.filename,
    size: attachment.size,
    mimeType: attachment.mimeType,
    color: attachment.color,
  });
}
