import { prisma } from "@/lib/prisma";
import type { TagTargetType } from "@prisma/client";

const MAX_TAG_LENGTH = 40;

export function normalizeTagName(raw: string): string {
  return raw.trim().replace(/^#+/, "").slice(0, MAX_TAG_LENGTH);
}

/** Get-or-create tagove po imenu (case-sensitive, bez duplikata) i vrati njihove id-jeve. */
export async function resolveTagIds(names: string[]): Promise<string[]> {
  const unique = [...new Set(names.map(normalizeTagName).filter(Boolean))];
  const ids: string[] = [];
  for (const name of unique) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
      select: { id: true },
    });
    ids.push(tag.id);
  }
  return ids;
}

/** Izvlaci imena tagova iz sanitizovanog HTML-a clanka (inline #tag mention cvorovi iz editora). */
export function extractTagNamesFromHtml(html: string): string[] {
  const names = new Set<string>();
  const re = /data-tag-name="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    names.add(match[1]);
  }
  return [...names];
}

export async function setArticleTags(articleId: string, tagNames: string[]) {
  const tagIds = await resolveTagIds(tagNames);
  await prisma.$transaction([
    prisma.articleTag.deleteMany({ where: { articleId } }),
    ...(tagIds.length > 0
      ? [prisma.articleTag.createMany({ data: tagIds.map((tagId) => ({ articleId, tagId })) })]
      : []),
  ]);
}

export type TagForDisplay = {
  id: string;
  name: string;
  targetType: TagTargetType;
  targetUrl: string | null;
  targetArticle: { id: string; sectionId: string } | null;
  targetSection: { id: string } | null;
};

export const TAG_DISPLAY_INCLUDE = {
  targetArticle: { select: { id: true, sectionId: true } },
  targetSection: { select: { id: true } },
} as const;

export function resolveTagHref(tag: TagForDisplay): { href: string; external: boolean } {
  if (tag.targetType === "ARTICLE" && tag.targetArticle) {
    return {
      href: `/kategorija/${tag.targetArticle.sectionId}/clanak/${tag.targetArticle.id}`,
      external: false,
    };
  }
  if (tag.targetType === "SECTION" && tag.targetSection) {
    return { href: `/kategorija/${tag.targetSection.id}`, external: false };
  }
  if (tag.targetType === "URL" && tag.targetUrl) {
    return { href: tag.targetUrl, external: true };
  }
  return { href: `/pretraga?q=${encodeURIComponent(tag.name)}`, external: false };
}

/** Dozvoljava samo relativne putanje i http(s) URL-ove - sprecava javascript: i slicne seme. */
export function isSafeTagUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) return true;
  return /^https?:\/\//i.test(trimmed);
}
