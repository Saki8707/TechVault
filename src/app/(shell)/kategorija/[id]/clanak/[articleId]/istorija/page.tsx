import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSectionPath, isSectionHiddenFromNonAdmin } from "@/lib/sections";
import { canReadSection } from "@/lib/permissions";

export default async function ArticleHistoryPage({
  params,
}: {
  params: Promise<{ id: string; articleId: string }>;
}) {
  const { id, articleId } = await params;

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { title: true, sectionId: true },
  });
  if (!article || article.sectionId !== id) notFound();

  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  if (!isAdmin && (await isSectionHiddenFromNonAdmin(id))) notFound();

  const canRead = await canReadSection(user ? { id: user.id, role: user.role } : null, id);
  if (!canRead) notFound();

  const [breadcrumb, revisions] = await Promise.all([
    getSectionPath(id),
    prisma.articleRevision.findMany({
      where: { articleId },
      orderBy: { editedAt: "desc" },
      include: { editedBy: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Kategorije</BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumb.map((crumb) => (
            <React.Fragment key={crumb.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href={`/kategorija/${crumb.id}`} />}>
                  {crumb.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </React.Fragment>
          ))}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={`/kategorija/${id}/clanak/${articleId}`} />}>
              {article.title}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Istorija izmena</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <History className="h-5 w-5" />
        Istorija izmena
      </h1>

      {revisions.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Još nema starijih verzija — ovo je prva verzija članka.
        </p>
      ) : (
        <div className="space-y-4">
          {revisions.map((rev, i) => (
            <details key={rev.id} className="rounded-lg border">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                <span className="font-medium">
                  Verzija pre izmene #{revisions.length - i}
                </span>
                <span className="ml-2 text-muted-foreground">
                  {rev.editedBy.name} ·{" "}
                  {new Intl.DateTimeFormat("sr-RS", {
                    dateStyle: "long",
                    timeStyle: "short",
                  }).format(rev.editedAt)}
                </span>
              </summary>
              <div
                className="prose prose-sm dark:prose-invert max-w-none border-t px-4 py-3"
                dangerouslySetInnerHTML={{ __html: rev.contentHtml }}
              />
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
