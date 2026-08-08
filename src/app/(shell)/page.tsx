import Link from "next/link";
import { FileText, EyeOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSectionTree, countArticlesDeep, filterTreeByIds } from "@/lib/sections";
import { getAccessibleSections } from "@/lib/permissions";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  const [fullTree, { visible }] = await Promise.all([
    getSectionTree(isAdmin),
    getAccessibleSections(user ? { id: user.id, role: user.role } : null),
  ]);
  const tree = filterTreeByIds(fullTree, visible);

  return (
    <div className="mx-auto max-w-6xl 2xl:max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Kategorije</h1>
        <p className="text-base text-muted-foreground">
          Sva tehnička dokumentacija na jednom mestu — izaberi kategoriju ili koristi
          pretragu iznad.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tree.map((section) => {
          const total = countArticlesDeep(section);
          const subCount = section.children.length;

          return (
            <Link key={section.id} href={`/kategorija/${section.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="h-1.5 w-full rounded-t-xl bg-gradient-to-r from-brand-from to-brand-to" />
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-2 text-lg sm:text-xl">
                    <span className="line-clamp-2">{section.name}</span>
                    {section.hidden && (
                      <Badge variant="secondary" className="shrink-0 gap-1">
                        <EyeOff className="h-3 w-3" />
                        Skriveno
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-3 pt-1 text-sm">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {total} {total === 1 ? "članak" : "članaka"}
                    </span>
                    {subCount > 0 && (
                      <span>
                        {subCount} {subCount === 1 ? "podkategorija" : "podkategorija"}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
