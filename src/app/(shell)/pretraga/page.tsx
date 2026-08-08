import Link from "next/link";
import { FileText, FolderTree, SearchX } from "lucide-react";
import { auth } from "@/auth";
import { searchAll, logSearch, getArticlesByFilter, type StandardFilterMode } from "@/lib/search";
import { getSectionPath, getSectionTree, flattenSectionTree, filterTreeByIds } from "@/lib/sections";
import { getAccessibleSections } from "@/lib/permissions";
import { SearchFilters } from "@/components/layout/search-filters";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; scope?: string; scopeMode?: string }>;
}) {
  const { q, filter, scope: scopeParam, scopeMode } = await searchParams;
  const query = q?.trim() ?? "";

  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  const userId = user?.id;

  const { readable, visible } = await getAccessibleSections(
    user ? { id: user.id, role: user.role } : null,
  );
  const allowedSectionIds = readable === "all" ? null : readable;

  const tree = await getSectionTree(isAdmin);
  const flatSections = flattenSectionTree(filterTreeByIds(tree, visible));

  const scope =
    scopeParam && scopeParam.length > 0
      ? { sectionIds: scopeParam.split(",").filter(Boolean), mode: (scopeMode === "exclude" ? "exclude" : "only") as "only" | "exclude" }
      : null;

  const standardFilter =
    filter === "myViews" || filter === "myFromSearch" || filter === "sitePopularSearch"
      ? (filter as StandardFilterMode)
      : null;

  let results: Awaited<ReturnType<typeof searchAll>> = [];

  if (standardFilter && userId) {
    results = await getArticlesByFilter(standardFilter, userId, allowedSectionIds);
    if (scope) {
      results = results.filter((r) => {
        if (r.type !== "article") return true;
        const inScope = scope.sectionIds.includes(r.sectionId);
        return scope.mode === "only" ? inScope : !inScope;
      });
    }
  } else if (query) {
    results = await searchAll(query, allowedSectionIds, 50, scope);
    if (userId) logSearch(userId, query).catch(() => {});
  }

  const uniqueSectionIds = [
    ...new Set(results.map((r) => (r.type === "article" ? r.sectionId : r.id))),
  ];
  const pathEntries = await Promise.all(
    uniqueSectionIds.map(async (id) => [id, await getSectionPath(id)] as const),
  );
  const pathMap = new Map(pathEntries);

  const showEmptyState = !standardFilter && !query;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        Pretraga{query && <span className="text-muted-foreground"> — &quot;{query}&quot;</span>}
      </h1>

      <SearchFilters sections={flatSections} />

      {showEmptyState ? (
        <p className="text-base text-muted-foreground">Unesi pojam u pretragu iznad.</p>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center text-base text-muted-foreground">
          <SearchX className="h-8 w-8" />
          Nema rezultata.
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? "rezultat" : "rezultata"}
          </p>
          <div className="divide-y rounded-lg border">
            {results.map((r) => {
              const sectionId = r.type === "article" ? r.sectionId : r.id;
              const path = pathMap.get(sectionId) ?? [];
              const href =
                r.type === "article"
                  ? `/kategorija/${r.sectionId}/clanak/${r.id}?from=search`
                  : `/kategorija/${r.id}`;

              return (
                <Link
                  key={`${r.type}:${r.id}`}
                  href={href}
                  className="block px-4 py-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 text-base font-medium">
                    {r.type === "article" ? (
                      <FileText
                        className={`h-4 w-4 shrink-0 ${r.color ? "" : "text-muted-foreground"}`}
                        style={r.color ? { color: r.color } : undefined}
                      />
                    ) : (
                      <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    {r.type === "article" ? r.title : r.name}
                  </div>
                  <p className="mt-0.5 pl-6 text-xs text-muted-foreground">
                    {path.map((p) => p.name).join(" / ") || "Kategorija"}
                  </p>
                  {r.type === "article" && r.snippet && (
                    <p
                      className="mt-1 pl-6 text-sm text-muted-foreground [&_mark]:bg-primary/20 [&_mark]:text-foreground [&_mark]:not-italic"
                      dangerouslySetInnerHTML={{ __html: r.snippet }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
