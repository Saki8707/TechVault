"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSafeTagUrl } from "@/lib/tags";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Samo admin može da upravlja tagovima.");
  }
  return session.user;
}

export async function updateTagTarget(
  tagId: string,
  targetType: "ARTICLE" | "SECTION" | "URL" | "NONE",
  targetArticleId: string | null,
  targetSectionId: string | null,
  targetUrl: string | null,
) {
  await requireAdmin();

  if (targetType === "ARTICLE" && !targetArticleId) {
    throw new Error("Izaberi dodatni fajl za destinaciju.");
  }
  if (targetType === "SECTION" && !targetSectionId) {
    throw new Error("Izaberi kategoriju za destinaciju.");
  }
  if (targetType === "URL") {
    if (!targetUrl || !isSafeTagUrl(targetUrl)) {
      throw new Error("URL mora počinjati sa http://, https:// ili /.");
    }
  }

  await prisma.tag.update({
    where: { id: tagId },
    data: {
      targetType,
      targetArticleId: targetType === "ARTICLE" ? targetArticleId : null,
      targetSectionId: targetType === "SECTION" ? targetSectionId : null,
      targetUrl: targetType === "URL" ? targetUrl : null,
    },
  });

  revalidatePath("/admin/tagovi");
  revalidatePath("/", "layout");
}

export async function deleteTag(tagId: string) {
  await requireAdmin();
  await prisma.tag.delete({ where: { id: tagId } });
  revalidatePath("/admin/tagovi");
  revalidatePath("/", "layout");
}
