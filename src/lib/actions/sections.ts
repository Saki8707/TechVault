"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeArticleHtml } from "@/lib/html";
import { canWriteSection } from "@/lib/permissions";
import { isSectionHiddenFromNonAdmin } from "@/lib/sections";

export async function updateSectionContent(sectionId: string, contentHtml: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Niste prijavljeni.");

  if (session.user.role !== "ADMIN" && (await isSectionHiddenFromNonAdmin(sectionId))) {
    throw new Error("Nemate dozvolu za izmene u ovoj kategoriji.");
  }

  const allowed = await canWriteSection(
    { id: session.user.id, role: session.user.role },
    sectionId,
  );
  if (!allowed) throw new Error("Nemate dozvolu za izmene u ovoj kategoriji.");

  const cleanHtml = sanitizeArticleHtml(contentHtml);
  const isEmpty = cleanHtml.replace(/<[^>]+>/g, "").trim().length === 0;

  await prisma.section.update({
    where: { id: sectionId },
    data: {
      contentHtml: isEmpty ? null : cleanHtml,
      contentUpdatedAt: isEmpty ? null : new Date(),
      contentUpdatedById: isEmpty ? null : session.user.id,
    },
  });

  revalidatePath(`/kategorija/${sectionId}`, "page");
}
