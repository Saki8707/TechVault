import { prisma } from "@/lib/prisma";
import { getSectionTree, flattenSectionTree } from "@/lib/sections";
import { TagManager } from "@/components/admin/tag-manager";

export default async function AdminTagoviPage() {
  const [tags, articles, tree] = await Promise.all([
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: {
        targetArticle: { select: { id: true, title: true } },
        targetSection: { select: { id: true, name: true } },
        _count: { select: { articleTags: true } },
      },
    }),
    prisma.article.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, section: { select: { name: true } } },
    }),
    getSectionTree(true),
  ]);

  const sections = flattenSectionTree(tree);

  const tagRows = tags.map((t) => ({
    id: t.id,
    name: t.name,
    targetType: t.targetType,
    targetArticleId: t.targetArticleId,
    targetArticleTitle: t.targetArticle?.title ?? null,
    targetSectionId: t.targetSectionId,
    targetSectionName: t.targetSection?.name ?? null,
    targetUrl: t.targetUrl,
    articleCount: t._count.articleTags,
  }));

  const articleOptions = articles.map((a) => ({
    id: a.id,
    label: `${a.title} — ${a.section.name}`,
  }));

  return <TagManager tags={tagRows} sections={sections} articles={articleOptions} />;
}
