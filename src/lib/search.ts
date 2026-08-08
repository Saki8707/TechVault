import { prisma } from "@/lib/prisma";

export type ArticleResult = {
  type: "article";
  id: string;
  title: string;
  sectionId: string;
  color: string | null;
  updatedAt: Date;
  snippet: string;
};

export type SectionResult = {
  type: "section";
  id: string;
  name: string;
};

export type SearchResult = ArticleResult | SectionResult;

export type SearchScope = {
  /** Ako je zadato, pretraga se ogranicava/iskljucuje za ove sectionId-jeve. */
  sectionIds: string[];
  /** true = pretrazuj SAMO ove sekcije; false = iskljuci ove sekcije iz pretrage. */
  mode: "only" | "exclude";
} | null;

/**
 * Kombinovana pretraga: clanci (substring bilo gde u reci - "figur" pronalazi
 * "konfiguracija") i nazivi kategorija. Substring pretraga koristi ILIKE uz
 * pg_trgm GIN indekse za performanse; tsvector/ts_headline se koriste samo za
 * rangiranje i generisanje isticanog snippet-a.
 */
export async function searchAll(
  query: string,
  allowedSectionIds: Set<string> | null,
  limit = 50,
  scope: SearchScope = null,
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const like = `%${trimmed}%`;
  const fetchLimit = limit * 2;

  const [articles, sections] = await Promise.all([
    prisma.$queryRaw<ArticleResult[]>`
      SELECT
        'article' AS type,
        a."id",
        a."title",
        a."sectionId",
        a."color",
        a."updatedAt",
        COALESCE(
          (
            SELECT
              CASE WHEN pos > 60 THEN '…' ELSE '' END
              || substring(a."contentText" from GREATEST(1, pos - 60) for 200)
              || CASE WHEN pos + 140 < length(a."contentText") THEN '…' ELSE '' END
            FROM (SELECT position(lower(${trimmed}) in lower(a."contentText")) AS pos) p
            WHERE pos > 0
          ),
          left(a."contentText", 160)
        ) AS snippet
      FROM "Article" a
      WHERE a."title" ILIKE ${like} OR a."contentText" ILIKE ${like}
      ORDER BY
        (a."title" ILIKE ${like}) DESC,
        ts_rank(a."searchVector", websearch_to_tsquery('simple', ${trimmed})) DESC,
        a."updatedAt" DESC
      LIMIT ${fetchLimit}
    `,
    prisma.$queryRaw<SectionResult[]>`
      SELECT 'section' AS type, s."id", s."name"
      FROM "Section" s
      WHERE s."name" ILIKE ${like}
      ORDER BY s."name" ASC
      LIMIT 15
    `,
  ]);

  // Istice pronadjeni pojam u snippet-u (bezbedno escape-ovano, radi i za delove reci)
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const highlightRe = new RegExp(`(${escaped})`, "gi");
  for (const a of articles) {
    a.snippet = a.snippet.replace(highlightRe, "<mark>$1</mark>");
  }

  function scopeAllows(sectionId: string): boolean {
    if (!scope || scope.sectionIds.length === 0) return true;
    const inScope = scope.sectionIds.includes(sectionId);
    return scope.mode === "only" ? inScope : !inScope;
  }

  const merged: SearchResult[] = [];

  for (const a of articles) {
    if (allowedSectionIds && !allowedSectionIds.has(a.sectionId)) continue;
    if (!scopeAllows(a.sectionId)) continue;
    merged.push(a);
  }

  for (const s of sections) {
    if (allowedSectionIds && !allowedSectionIds.has(s.id)) continue;
    if (!scopeAllows(s.id)) continue;
    merged.push(s);
  }

  return merged.slice(0, limit);
}

export async function logSearch(userId: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  await prisma.searchLog.create({ data: { userId, query: trimmed } });
}

export async function logArticleView(userId: string, articleId: string, fromSearch: boolean) {
  await prisma.articleView.create({ data: { userId, articleId, fromSearch } });
}

export type PopularQuery = { query: string; count: number };

export async function getPopularSearches(userId: string, limit = 5) {
  const [mine, global] = await Promise.all([
    prisma.$queryRaw<PopularQuery[]>`
      SELECT "query", COUNT(*)::int AS count
      FROM "SearchLog"
      WHERE "userId" = ${userId}
      GROUP BY "query"
      ORDER BY count DESC, MAX("createdAt") DESC
      LIMIT ${limit}
    `,
    prisma.$queryRaw<PopularQuery[]>`
      SELECT "query", COUNT(*)::int AS count
      FROM "SearchLog"
      GROUP BY "query"
      ORDER BY count DESC, MAX("createdAt") DESC
      LIMIT ${limit}
    `,
  ]);

  return { mine, global };
}

export type StandardFilterMode = "myViews" | "myFromSearch" | "sitePopularSearch";

/** Clanci poredjani po jednom od standardnih filtera (vidljivost vec primenjena spolja). */
export async function getArticlesByFilter(
  mode: StandardFilterMode,
  userId: string,
  allowedSectionIds: Set<string> | null,
  limit = 30,
): Promise<ArticleResult[]> {
  let rows: { articleId: string; count: number }[] = [];

  if (mode === "myViews") {
    rows = await prisma.$queryRaw<{ articleId: string; count: number }[]>`
      SELECT "articleId", COUNT(*)::int AS count
      FROM "ArticleView"
      WHERE "userId" = ${userId}
      GROUP BY "articleId"
      ORDER BY count DESC, MAX("viewedAt") DESC
      LIMIT ${limit}
    `;
  } else if (mode === "myFromSearch") {
    rows = await prisma.$queryRaw<{ articleId: string; count: number }[]>`
      SELECT "articleId", COUNT(*)::int AS count
      FROM "ArticleView"
      WHERE "userId" = ${userId} AND "fromSearch" = true
      GROUP BY "articleId"
      ORDER BY count DESC, MAX("viewedAt") DESC
      LIMIT ${limit}
    `;
  } else {
    rows = await prisma.$queryRaw<{ articleId: string; count: number }[]>`
      SELECT "articleId", COUNT(*)::int AS count
      FROM "ArticleView"
      WHERE "fromSearch" = true
      GROUP BY "articleId"
      ORDER BY count DESC, MAX("viewedAt") DESC
      LIMIT ${limit}
    `;
  }

  const ids = rows.map((r) => r.articleId);
  if (ids.length === 0) return [];

  const articles = await prisma.article.findMany({
    where: {
      id: { in: ids },
      ...(allowedSectionIds ? { sectionId: { in: [...allowedSectionIds] } } : {}),
    },
    select: { id: true, title: true, sectionId: true, color: true, updatedAt: true, contentText: true },
  });

  const order = new Map(ids.map((id, i) => [id, i]));
  return articles
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map((a) => ({
      type: "article" as const,
      id: a.id,
      title: a.title,
      sectionId: a.sectionId,
      color: a.color,
      updatedAt: a.updatedAt,
      snippet: a.contentText.slice(0, 160),
    }));
}
