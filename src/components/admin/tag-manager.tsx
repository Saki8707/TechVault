"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Tag as TagIcon, FileText, FolderTree, Link2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { FlatSection } from "@/lib/sections";
import { updateTagTarget, deleteTag } from "@/app/admin/tagovi/actions";

type TargetType = "ARTICLE" | "SECTION" | "URL" | "NONE";

type TagRow = {
  id: string;
  name: string;
  targetType: TargetType;
  targetArticleId: string | null;
  targetArticleTitle: string | null;
  targetSectionId: string | null;
  targetSectionName: string | null;
  targetUrl: string | null;
  articleCount: number;
};

type ArticleOption = { id: string; label: string };

type EditState = {
  tag: TagRow;
  targetType: TargetType;
  targetArticleId: string | null;
  targetSectionId: string | null;
  targetUrl: string;
  articleQuery: string;
} | null;

function targetSummary(tag: TagRow) {
  if (tag.targetType === "ARTICLE" && tag.targetArticleTitle) {
    return { icon: FileText, text: tag.targetArticleTitle };
  }
  if (tag.targetType === "SECTION" && tag.targetSectionName) {
    return { icon: FolderTree, text: tag.targetSectionName };
  }
  if (tag.targetType === "URL" && tag.targetUrl) {
    return { icon: Link2, text: tag.targetUrl };
  }
  return { icon: Search, text: "Bez destinacije (vodi na pretragu)" };
}

export function TagManager({
  tags,
  sections,
  articles,
}: {
  tags: TagRow[];
  sections: FlatSection[];
  articles: ArticleOption[];
}) {
  const [edit, setEdit] = useState<EditState>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagRow | null>(null);
  const [isPending, setIsPending] = useState(false);

  const filteredArticles = useMemo(() => {
    if (!edit) return [];
    const q = edit.articleQuery.trim().toLowerCase();
    if (!q) return articles.slice(0, 20);
    return articles.filter((a) => a.label.toLowerCase().includes(q)).slice(0, 20);
  }, [edit, articles]);

  function openEdit(tag: TagRow) {
    setEdit({
      tag,
      targetType: tag.targetType,
      targetArticleId: tag.targetArticleId,
      targetSectionId: tag.targetSectionId,
      targetUrl: tag.targetUrl ?? "",
      articleQuery: "",
    });
  }

  async function submitEdit() {
    if (!edit) return;
    setIsPending(true);
    try {
      await updateTagTarget(
        edit.tag.id,
        edit.targetType,
        edit.targetArticleId,
        edit.targetSectionId,
        edit.targetUrl || null,
      );
      toast.success("Destinacija taga je sačuvana.");
      setIsPending(false);
      setEdit(null);
    } catch (err) {
      setIsPending(false);
      toast.error(err instanceof Error ? err.message : "Greška.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsPending(true);
    try {
      await deleteTag(deleteTarget.id);
      toast.success("Tag je obrisan.");
      setIsPending(false);
      setDeleteTarget(null);
    } catch (err) {
      setIsPending(false);
      toast.error(err instanceof Error ? err.message : "Greška.");
    }
  }

  const selectedArticleLabel = edit?.targetArticleId
    ? articles.find((a) => a.id === edit.targetArticleId)?.label
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tagovi</h1>
        <p className="text-sm text-muted-foreground">
          Podesi destinaciju svakog taga - kad korisnik klikne na tag u dodatnom fajlu, odlazi na
          izabrani dodatni fajl, kategoriju ili URL. Bez destinacije, tag vodi na pretragu po imenu taga.
        </p>
      </div>

      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">Još nema tagova - dodaju se pri pisanju dodatnog fajla.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {tags.map((tag) => {
            const { icon: Icon, text } = targetSummary(tag);
            return (
              <div key={tag.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <TagIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-medium">#{tag.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {tag.articleCount} {tag.articleCount === 1 ? "dodatni fajl" : "dodatnih fajlova"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{text}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label="Izmeni" onClick={() => openEdit(tag)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Obriši"
                    onClick={() => setDeleteTarget(tag)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={edit !== null} onOpenChange={(open) => !open && setEdit(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Destinacija taga #{edit?.tag.name}</DialogTitle>
            <DialogDescription>
              Izaberi gde vodi klik na ovaj tag u prikazu dodatnog fajla.
            </DialogDescription>
          </DialogHeader>

          {edit && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tip destinacije</Label>
                <Select
                  value={edit.targetType}
                  onValueChange={(v) => setEdit({ ...edit, targetType: v as TargetType })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Bez destinacije (pretraga po tagu)</SelectItem>
                    <SelectItem value="ARTICLE">Dodatni fajl</SelectItem>
                    <SelectItem value="SECTION">Kategorija</SelectItem>
                    <SelectItem value="URL">Spoljni URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {edit.targetType === "ARTICLE" && (
                <div className="space-y-2">
                  <Label>Dodatni fajl</Label>
                  {selectedArticleLabel && (
                    <p className="text-xs text-muted-foreground">
                      Izabrano: <span className="font-medium">{selectedArticleLabel}</span>
                    </p>
                  )}
                  <Input
                    value={edit.articleQuery}
                    onChange={(e) => setEdit({ ...edit, articleQuery: e.target.value })}
                    placeholder="Pretraži dodatne fajlove..."
                  />
                  <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-md border p-1">
                    {filteredArticles.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setEdit({ ...edit, targetArticleId: a.id })}
                        className={`block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-muted/50 ${
                          edit.targetArticleId === a.id ? "bg-muted font-medium" : ""
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                    {filteredArticles.length === 0 && (
                      <p className="px-2 py-1.5 text-sm text-muted-foreground">Nema rezultata.</p>
                    )}
                  </div>
                </div>
              )}

              {edit.targetType === "SECTION" && (
                <div className="space-y-2">
                  <Label>Kategorija</Label>
                  <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-md border p-1">
                    {sections.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setEdit({ ...edit, targetSectionId: s.id })}
                        style={{ paddingLeft: `${8 + s.depth * 16}px` }}
                        className={`block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-muted/50 ${
                          edit.targetSectionId === s.id ? "bg-muted font-medium" : ""
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {edit.targetType === "URL" && (
                <div className="space-y-2">
                  <Label htmlFor="tag-url">URL</Label>
                  <Input
                    id="tag-url"
                    value={edit.targetUrl}
                    onChange={(e) => setEdit({ ...edit, targetUrl: e.target.value })}
                    placeholder="https://... ili /kategorija/..."
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)} disabled={isPending}>
              Otkaži
            </Button>
            <Button onClick={submitEdit} disabled={isPending}>
              Sačuvaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obriši tag &quot;#{deleteTarget?.name}&quot;?</DialogTitle>
            <DialogDescription>
              Tag će biti uklonjen sa svih dodatnih fajlova koji ga koriste. Ova akcija se ne može poništiti.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>
              Otkaži
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
              Obriši
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
