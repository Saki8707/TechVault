"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, FolderTree, History, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";

type ArticleResult = {
  type: "article";
  id: string;
  title: string;
  sectionId: string;
  color: string | null;
  snippet: string;
  pathNames: string[];
};

type SectionResult = {
  type: "section";
  id: string;
  name: string;
  pathNames: string[];
};

type Result = ArticleResult | SectionResult;

type PopularQuery = { query: string; count: number };

export function SearchBox() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [popular, setPopular] = useState<{ mine: PopularQuery[]; global: PopularQuery[] } | null>(
    null,
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        if (data.popular) setPopular(data.popular);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function refreshPopular() {
    try {
      const res = await fetch(`/api/search/suggest?q=`);
      const data = await res.json();
      if (data.popular) setPopular(data.popular);
    } catch {
      // tiho ignorisi - stara lista ostaje prikazana
    }
  }

  function handleFocus() {
    setOpen(true);
    // osvezi popularne pretrage pri svakom ponovnom otvaranju (ne samo pri prvom mount-u)
    if (query.trim().length < 2) refreshPopular();
  }

  async function goToResult(r: Result) {
    setOpen(false);
    fetch("/api/search/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    }).catch(() => {});

    if (r.type === "article") {
      router.push(`/kategorija/${r.sectionId}/clanak/${r.id}?from=search`);
    } else {
      router.push(`/kategorija/${r.id}`);
    }
  }

  function goToQuery(q: string) {
    setOpen(false);
    router.push(`/pretraga?q=${encodeURIComponent(q)}`);
  }

  const showPopular = query.trim().length < 2;
  const hasPopular =
    popular && (popular.mine.length > 0 || popular.global.length > 0);

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 sm:w-full">
      <form action="/pretraga" method="get">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder="Pretraži sve kategorije i članke..."
          className="h-10 w-full rounded-full pl-11 text-base shadow-sm sm:h-11"
          autoComplete="off"
        />
      </form>

      {open && (
        <div className="absolute top-full left-0 right-0 z-40 mt-2 max-h-[28rem] overflow-y-auto rounded-xl border bg-popover text-popover-foreground shadow-lg">
          {!showPopular && loading && (
            <p className="px-4 py-3 text-sm text-muted-foreground">Pretraživanje...</p>
          )}

          {!showPopular && !loading && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Nema rezultata za &quot;{query}&quot;.
            </p>
          )}

          {!showPopular &&
            results.map((r) => (
              <button
                key={`${r.type}:${r.id}`}
                type="button"
                onClick={() => goToResult(r)}
                className="flex w-full items-start gap-3 border-b px-4 py-2.5 text-left last:border-b-0 hover:bg-muted/50"
              >
                <span className="flex w-28 shrink-0 flex-col items-start gap-1 pt-0.5 sm:w-36">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    {r.type === "article" ? (
                      <FileText
                        className="h-3.5 w-3.5 shrink-0"
                        style={r.color ? { color: r.color } : undefined}
                      />
                    ) : (
                      <FolderTree className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">
                      {r.pathNames.length > 0 ? r.pathNames.join(" › ") : "Kategorija"}
                    </span>
                  </span>
                </span>
                <span className="min-w-0 flex-1 border-l pl-3">
                  <span className="block truncate text-sm font-medium">
                    {r.type === "article" ? r.title : r.name}
                  </span>
                  {r.type === "article" && r.snippet && (
                    <span
                      className="mt-1 block text-xs text-muted-foreground [&_mark]:rounded [&_mark]:bg-primary/20 [&_mark]:px-0.5 [&_mark]:text-foreground [&_mark]:not-italic"
                      dangerouslySetInnerHTML={{ __html: r.snippet }}
                    />
                  )}
                </span>
              </button>
            ))}

          {showPopular && (
            <div className="p-2">
              {!hasPopular && (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  Počni da kucaš za pretragu...
                </p>
              )}
              {popular && popular.mine.length > 0 && (
                <div className="mb-2">
                  <p className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground">
                    <History className="h-3.5 w-3.5" />
                    Tvoje najčešće pretrage
                  </p>
                  {popular.mine.map((p) => (
                    <button
                      key={p.query}
                      type="button"
                      onClick={() => goToQuery(p.query)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50"
                    >
                      <span className="truncate">{p.query}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{p.count}×</span>
                    </button>
                  ))}
                </div>
              )}
              {popular && popular.global.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Najpopularnije na sajtu
                  </p>
                  {popular.global.map((p) => (
                    <button
                      key={p.query}
                      type="button"
                      onClick={() => goToQuery(p.query)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50"
                    >
                      <span className="truncate">{p.query}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{p.count}×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
