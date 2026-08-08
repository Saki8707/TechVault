import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type SectionNode = {
  id: string;
  slug: string;
  name: string;
  order: number;
  hidden: boolean;
  guestVisible: boolean;
  color: string | null;
  parentId: string | null;
  children: SectionNode[];
  articleCount: number;
};

/**
 * `includeHidden: false` (podrazumevano) izbacuje sekcije obelezene kao skrivene
 * i ceo njihov podstablo - koriste ga obicni korisnici. Admin prosledjuje true.
 */
export const getSectionTree = cache(async (includeHidden = false): Promise<SectionNode[]> => {
  const [sections, counts] = await Promise.all([
    prisma.section.findMany({ orderBy: { order: "asc" } }),
    prisma.article.groupBy({ by: ["sectionId"], _count: { _all: true } }),
  ]);

  const countMap = new Map(counts.map((c) => [c.sectionId, c._count._all]));
  const nodeMap = new Map<string, SectionNode>();

  for (const s of sections) {
    if (!includeHidden && s.hidden) continue;
    nodeMap.set(s.id, { ...s, children: [], articleCount: countMap.get(s.id) ?? 0 });
  }

  const roots: SectionNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else if (!node.parentId) {
      roots.push(node);
    }
    // cvorovi ciji je roditelj skriven (pa izostavljen iz nodeMap) se ne prikazuju uopste
  }

  return roots;
});

/** Zbirni broj clanaka u sekciji i svim njenim potomcima. */
export function countArticlesDeep(node: SectionNode): number {
  return node.articleCount + node.children.reduce((sum, c) => sum + countArticlesDeep(c), 0);
}

export type SectionBreadcrumbItem = { id: string; slug: string; name: string };

/** Lanac predaka (koren -> sebe) za dato sectionId, koristi se za linkove/breadcrumb. */
export async function getSectionPath(sectionId: string): Promise<SectionBreadcrumbItem[]> {
  const chain: SectionBreadcrumbItem[] = [];
  let currentId: string | null = sectionId;

  while (currentId) {
    const s: { id: string; slug: string; name: string; parentId: string | null } | null =
      await prisma.section.findUnique({
        where: { id: currentId },
        select: { id: true, slug: true, name: true, parentId: true },
      });
    if (!s) break;
    chain.unshift({ id: s.id, slug: s.slug, name: s.name });
    currentId = s.parentId;
  }

  return chain;
}

/**
 * Da li je sekcija ili neki od njenih predaka obelezen kao skriven.
 * Non-admin korisnicima takve sekcije (i sve ispod njih) treba tretirati kao da ne postoje.
 */
export async function isSectionHiddenFromNonAdmin(sectionId: string): Promise<boolean> {
  let currentId: string | null = sectionId;

  while (currentId) {
    const s: { hidden: boolean; parentId: string | null } | null =
      await prisma.section.findUnique({
        where: { id: currentId },
        select: { hidden: true, parentId: true },
      });
    if (!s) return false;
    if (s.hidden) return true;
    currentId = s.parentId;
  }

  return false;
}

export type FlatSection = { id: string; name: string; depth: number; hidden: boolean };

/** Ravna lista svih sekcija (za izbor u formama), sa dubinom radi uvlacenja. */
export function flattenSectionTree(tree: SectionNode[], depth = 0): FlatSection[] {
  return tree.flatMap((node) => [
    { id: node.id, name: node.name, depth, hidden: node.hidden },
    ...flattenSectionTree(node.children, depth + 1),
  ]);
}

/** Filtrira stablo tako da ostanu samo cvorovi iz `ids` (ili sve, ako je "all"). */
export function filterTreeByIds(tree: SectionNode[], ids: Set<string> | "all"): SectionNode[] {
  if (ids === "all") return tree;
  const result: SectionNode[] = [];
  for (const node of tree) {
    const children = filterTreeByIds(node.children, ids);
    if (ids.has(node.id) || children.length > 0) {
      result.push({ ...node, children });
    }
  }
  return result;
}

/** Nalazi cvor (i njegovu podstablo dubine) po id-ju u vec ucitanom stablu. */
export function findNodeById(tree: SectionNode[], id: string): SectionNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
}

export type ArticleSummary = {
  id: string;
  title: string;
  slug: string;
  color: string | null;
  updatedAt: Date;
  updatedByName: string;
};

export async function getSectionArticles(sectionId: string): Promise<ArticleSummary[]> {
  const articles = await prisma.article.findMany({
    where: { sectionId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      color: true,
      updatedAt: true,
      updatedBy: { select: { name: true } },
    },
  });

  return articles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    color: a.color,
    updatedAt: a.updatedAt,
    updatedByName: a.updatedBy.name,
  }));
}
