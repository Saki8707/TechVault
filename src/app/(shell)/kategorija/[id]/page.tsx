import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Plus, FolderTree, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canWriteSection, getAccessibleSections } from "@/lib/permissions";
import { SectionContent } from "@/components/sections/section-content";
import {
  getSectionTree,
  getSectionPath,
  findNodeById,
  getSectionArticles,
  countArticlesDeep,
  isSectionHiddenFromNonAdmin,
} from "@/lib/sections";

export default async function SectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const section = await prisma.section.findUnique({
    where: { id },
    include: { contentUpdatedBy: { select: { name: true } } },
  });
  if (!section) notFound();

  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";

  if (!isAdmin && (await isSectionHiddenFromNonAdmin(id))) notFound();

  const { readable, visible } = await getAccessibleSections(
    user ? { id: user.id, role: user.role } : null,
  );
  const canView = isAdmin || visible === "all" || visible.has(id);
  if (!canView) notFound();
  const canReadHere = isAdmin || readable === "all" || readable.has(id);

  const [tree, breadcrumb, articles] = await Promise.all([
    getSectionTree(isAdmin),
    getSectionPath(id),
    canReadHere ? getSectionArticles(id) : Promise.resolve([]),
  ]);

  const node = findNodeById(tree, id);
  const visibleChildren = (node?.children ?? []).filter(
    (c) => isAdmin || visible === "all" || visible.has(c.id),
  );
  const canWrite = await canWriteSection(
    user ? { id: user.id, role: user.role } : null,
    id,
  );

  const contentUpdatedLabel =
    section.contentUpdatedAt && section.contentUpdatedBy
      ? `Izmenio/la ${section.contentUpdatedBy.name} · ${new Intl.DateTimeFormat("sr-RS", {
          dateStyle: "long",
          timeStyle: "short",
        }).format(section.contentUpdatedAt)}`
      : null;

  return (
    <div className="mx-auto max-w-6xl 2xl:max-w-7xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Kategorije</BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={crumb.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {i === breadcrumb.length - 1 ? (
                  <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={`/kategorija/${crumb.id}`} />}>
                    {crumb.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight break-words">{section.name}</h1>
        {canWrite && (
          <Button className="self-start sm:self-auto" render={<Link href={`/kategorija/${id}/novi`} />}>
            <Plus className="h-4 w-4" />
            Novi dodatni fajl
          </Button>
        )}
      </div>

      {canReadHere && (
        <SectionContent
          sectionId={id}
          initialContentHtml={section.contentHtml}
          canWrite={canWrite}
          isAdmin={isAdmin}
          updatedLabel={contentUpdatedLabel}
        />
      )}

      {visibleChildren.length > 0 && (
        <div>
          <h2 className="mb-2 text-base font-medium text-muted-foreground">Podkategorije</h2>
          <div className="divide-y rounded-lg border">
            {visibleChildren.map((child) => (
              <Link
                key={child.id}
                href={`/kategorija/${child.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-muted/50"
              >
                <span className="flex min-w-0 items-center gap-2 text-base font-medium">
                  <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{child.name}</span>
                  {child.hidden && (
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      <EyeOff className="h-3 w-3" />
                      Skriveno
                    </Badge>
                  )}
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {countArticlesDeep(child)} dodatnih fajlova
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-base font-medium text-muted-foreground">Dodatni fajlovi</h2>
        {!canReadHere ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nemaš pristup sadržaju ove kategorije - samo podkategorijama ispod.
          </p>
        ) : articles.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nema još nijednog dodatnog fajla u ovoj kategoriji.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/kategorija/${id}/clanak/${article.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="flex min-w-0 items-center gap-2 text-base font-medium">
                  <FileText
                    className={`h-4 w-4 shrink-0 ${article.color ? "" : "text-muted-foreground"}`}
                    style={article.color ? { color: article.color } : undefined}
                  />
                  <span className="truncate">{article.title}</span>
                </span>
                <span className="shrink-0 pl-6 text-xs text-muted-foreground sm:pl-0">
                  {article.updatedByName} ·{" "}
                  {new Intl.DateTimeFormat("sr-RS", { dateStyle: "medium" }).format(
                    article.updatedAt,
                  )}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
