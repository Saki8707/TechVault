import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canWriteSection, canReadSection } from "@/lib/permissions";
import { getSectionPath, isSectionHiddenFromNonAdmin } from "@/lib/sections";
import { logArticleView } from "@/lib/search";
import { getNotesForArticle } from "@/lib/notes";
import { ArticleActions } from "@/components/articles/article-actions";
import { ArticleAttachments } from "@/components/articles/article-attachments";
import { ArticleContentWithNotes } from "@/components/articles/article-content-with-notes";

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; articleId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id, articleId } = await params;
  const { from } = await searchParams;

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: {
      updatedBy: { select: { name: true } },
      attachments: { orderBy: { uploadedAt: "asc" } },
    },
  });
  if (!article || article.sectionId !== id) notFound();

  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  if (!isAdmin && (await isSectionHiddenFromNonAdmin(id))) notFound();

  const canRead = await canReadSection(user ? { id: user.id, role: user.role } : null, id);
  if (!canRead) notFound();

  const breadcrumb = await getSectionPath(id);
  const notes = await getNotesForArticle(articleId, user ? { id: user.id, role: user.role } : undefined);

  const canWrite = await canWriteSection(
    user ? { id: user.id, role: user.role } : null,
    id,
  );
  const canAddNotes = user?.role === "ADMIN" || user?.role === "USER";

  if (session?.user) {
    // fire-and-forget - ne blokira renderovanje stranice
    logArticleView(session.user.id, articleId, from === "search").catch(() => {});
  }

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
            <BreadcrumbPage>{article.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight break-words">{article.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Izmenio/la {article.updatedBy.name} ·{" "}
            {new Intl.DateTimeFormat("sr-RS", { dateStyle: "long", timeStyle: "short" }).format(
              article.updatedAt,
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={`/kategorija/${id}/clanak/${articleId}/istorija`} />}
          >
            <History className="h-4 w-4" />
            Istorija
          </Button>
          {canWrite && <ArticleActions sectionId={id} articleId={articleId} />}
        </div>
      </div>

      <ArticleContentWithNotes
        html={article.contentHtml}
        notes={notes}
        articleId={articleId}
        sectionId={id}
        canAddNotes={canAddNotes}
      />

      <ArticleAttachments
        articleId={articleId}
        canWrite={canWrite}
        initialAttachments={article.attachments.map((a) => ({
          id: a.id,
          filename: a.filename,
          size: a.size,
          mimeType: a.mimeType,
          color: a.color,
        }))}
      />
    </div>
  );
}
