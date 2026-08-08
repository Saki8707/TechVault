import Link from "next/link";
import { FilePlus, FilePen, FileX, Lock, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getRecentNoteAuditLog } from "@/lib/notes";

const ACTION_LABEL: Record<string, { label: string; icon: typeof FilePlus }> = {
  CREATED: { label: "Napisao/la", icon: FilePlus },
  UPDATED: { label: "Izmenio/la", icon: FilePen },
  DELETED: { label: "Obrisao/la", icon: FileX },
};

export default async function AdminLogPage() {
  const entries = await getRecentNoteAuditLog(200);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Log napomena</h1>
        <p className="text-sm text-muted-foreground">
          Ko je šta napisao, izmenio ili obrisao - poslednjih {entries.length} akcija na sajtu.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Još nema evidentiranih izmena napomena.
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {entries.map((e) => {
            const { label, icon: Icon } = ACTION_LABEL[e.action];
            return (
              <div key={e.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="flex items-center gap-1 font-medium">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {e.actorName}
                  </span>
                  <span className="text-muted-foreground">{label.toLowerCase()} napomenu na</span>
                  <Link
                    href={`/kategorija/${e.sectionId}/clanak/${e.articleId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {e.articleTitle}
                  </Link>
                  <Badge variant="outline" className="gap-1 text-xs">
                    {e.visibility === "ADMIN_ONLY" ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <StickyNote className="h-3 w-3" />
                    )}
                    {e.visibility === "ADMIN_ONLY" ? "interna" : "javna"}
                  </Badge>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("sr-RS", { dateStyle: "medium", timeStyle: "short" }).format(
                      e.createdAt,
                    )}
                  </span>
                </div>
                <p
                  className={`mt-1.5 whitespace-pre-wrap rounded-md border p-2 text-sm ${
                    e.action === "DELETED" ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {e.body}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
