import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canWriteSection } from "@/lib/permissions";
import { isSectionHiddenFromNonAdmin } from "@/lib/sections";
import { ArticleForm } from "@/components/articles/article-form";

export default async function NewArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const section = await prisma.section.findUnique({ where: { id } });
  if (!section) notFound();

  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  if (!isAdmin && (await isSectionHiddenFromNonAdmin(id))) notFound();

  const canWrite = await canWriteSection(
    user ? { id: user.id, role: user.role } : null,
    id,
  );
  if (!canWrite) redirect(`/kategorija/${id}`);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        Novi dodatni fajl — {section.name}
      </h1>
      <ArticleForm
        mode="create"
        sectionId={id}
        isAdmin={isAdmin}
        canAddNotes={user?.role === "ADMIN" || user?.role === "USER"}
      />
    </div>
  );
}
