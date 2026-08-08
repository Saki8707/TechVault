import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canWriteSection } from "@/lib/permissions";
import { isSectionHiddenFromNonAdmin } from "@/lib/sections";
import { ArticleForm } from "@/components/articles/article-form";
import { getNotesForArticle } from "@/lib/notes";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string; articleId: string }>;
}) {
  const { id, articleId } = await params;

  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article || article.sectionId !== id) notFound();

  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  if (!isAdmin && (await isSectionHiddenFromNonAdmin(id))) notFound();

  const canWrite = await canWriteSection(
    user ? { id: user.id, role: user.role } : null,
    id,
  );
  if (!canWrite) redirect(`/kategorija/${id}/clanak/${articleId}`);

  const notes = await getNotesForArticle(articleId, user ? { id: user.id, role: user.role } : undefined);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Izmeni dodatni fajl</h1>
      <ArticleForm
        mode="edit"
        articleId={articleId}
        initialTitle={article.title}
        initialContentHtml={article.contentHtml}
        initialColor={article.color}
        initialNotes={notes.map((n) => ({
          anchorId: n.anchorId,
          body: n.body,
          visibility: n.visibility,
          canManage: n.canManage,
        }))}
        isAdmin={isAdmin}
        canAddNotes={user?.role === "ADMIN" || user?.role === "USER"}
      />
    </div>
  );
}
