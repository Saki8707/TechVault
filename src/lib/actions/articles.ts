"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { htmlToPlainText, sanitizeArticleHtml } from "@/lib/html";
import { canWriteSection } from "@/lib/permissions";
import { isSectionHiddenFromNonAdmin } from "@/lib/sections";
import { setArticleTags, extractTagNamesFromHtml } from "@/lib/tags";
import { syncArticleNotes, type PendingNote } from "@/lib/notes";

async function requireWriteAccess(sectionId: string) {
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

  return session.user;
}

function validColor(color: string | null | undefined): string | null {
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : null;
}

async function uniqueSlugForSection(sectionId: string, baseSlug: string, excludeId?: string) {
  let slug = baseSlug || "clanak";
  let suffix = 2;

  while (
    await prisma.article.findFirst({
      where: { sectionId, slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    })
  ) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function createArticle(
  sectionId: string,
  title: string,
  contentHtml: string,
  notes: PendingNote[] = [],
  color: string | null = null,
) {
  const user = await requireWriteAccess(sectionId);

  const trimmedTitle = title.trim();
  if (!trimmedTitle) throw new Error("Naslov je obavezan.");

  const slug = await uniqueSlugForSection(sectionId, slugify(trimmedTitle));
  const cleanHtml = sanitizeArticleHtml(contentHtml);

  const article = await prisma.article.create({
    data: {
      title: trimmedTitle,
      slug,
      sectionId,
      contentHtml: cleanHtml,
      contentText: htmlToPlainText(cleanHtml),
      color: validColor(color),
      createdById: user.id,
      updatedById: user.id,
    },
  });

  await setArticleTags(article.id, extractTagNamesFromHtml(cleanHtml));
  // syncArticleNotes sama proverava ko sme sta (admin/vlasnik napomene) - ne veruj klijentu.
  await syncArticleNotes(article.id, cleanHtml, notes, { id: user.id, role: user.role });

  revalidatePath("/", "layout");
  redirect(`/kategorija/${sectionId}/clanak/${article.id}`);
}

export async function updateArticle(
  articleId: string,
  title: string,
  contentHtml: string,
  notes: PendingNote[] = [],
  color: string | null = null,
) {
  const article = await prisma.article.findUniqueOrThrow({
    where: { id: articleId },
    select: { sectionId: true, contentHtml: true, slug: true, title: true },
  });

  const user = await requireWriteAccess(article.sectionId);

  const trimmedTitle = title.trim();
  if (!trimmedTitle) throw new Error("Naslov je obavezan.");

  const slug =
    trimmedTitle === article.title
      ? article.slug
      : await uniqueSlugForSection(article.sectionId, slugify(trimmedTitle), articleId);
  const cleanHtml = sanitizeArticleHtml(contentHtml);

  await prisma.$transaction([
    prisma.articleRevision.create({
      data: {
        articleId,
        contentHtml: article.contentHtml,
        editedById: user.id,
      },
    }),
    prisma.article.update({
      where: { id: articleId },
      data: {
        title: trimmedTitle,
        slug,
        contentHtml: cleanHtml,
        contentText: htmlToPlainText(cleanHtml),
        color: validColor(color),
        updatedById: user.id,
      },
    }),
  ]);

  await setArticleTags(articleId, extractTagNamesFromHtml(cleanHtml));
  await syncArticleNotes(articleId, cleanHtml, notes, { id: user.id, role: user.role });

  revalidatePath("/", "layout");
  redirect(`/kategorija/${article.sectionId}/clanak/${articleId}`);
}

export async function deleteArticle(articleId: string) {
  const article = await prisma.article.findUniqueOrThrow({
    where: { id: articleId },
    select: { sectionId: true },
  });

  await requireWriteAccess(article.sectionId);

  await prisma.article.delete({ where: { id: articleId } });

  revalidatePath("/", "layout");
  redirect(`/kategorija/${article.sectionId}`);
}
