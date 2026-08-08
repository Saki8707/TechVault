"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FolderTree, Eye, EyeOff, Users, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { SectionNode } from "@/lib/sections";
import { countArticlesDeep } from "@/lib/sections";
import {
  createSection,
  renameSection,
  deleteSection,
  toggleSectionHidden,
  toggleSectionGuestVisible,
  setSectionColor,
} from "@/app/admin/kategorije/actions";

type DialogState =
  | { type: "create"; parentId: string | null; parentName: string }
  | { type: "rename"; id: string; currentName: string }
  | { type: "delete"; id: string; name: string; articleCount: number; childCount: number }
  | null;

function countDescendantSections(node: SectionNode): number {
  return node.children.reduce((sum, c) => sum + 1 + countDescendantSections(c), 0);
}

export function SectionTreeEditor({ tree }: { tree: SectionNode[] }) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [inputValue, setInputValue] = useState("");
  const [isPending, setIsPending] = useState(false);

  function openCreate(parentId: string | null, parentName: string) {
    setInputValue("");
    setDialog({ type: "create", parentId, parentName });
  }

  function openRename(id: string, currentName: string) {
    setInputValue(currentName);
    setDialog({ type: "rename", id, currentName });
  }

  function openDelete(node: SectionNode) {
    setDialog({
      type: "delete",
      id: node.id,
      name: node.name,
      articleCount: countArticlesDeep(node),
      childCount: countDescendantSections(node),
    });
  }

  async function handleToggleHidden(node: SectionNode) {
    try {
      await toggleSectionHidden(node.id, !node.hidden);
      toast.success(node.hidden ? "Kategorija je sada vidljiva." : "Kategorija je sada skrivena.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Došlo je do greške.");
    }
  }

  async function handleToggleGuestVisible(node: SectionNode) {
    try {
      await toggleSectionGuestVisible(node.id, !node.guestVisible);
      toast.success(
        node.guestVisible ? "Više nije vidljivo Guest nalozima." : "Sada je vidljivo Guest nalozima.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Došlo je do greške.");
    }
  }

  async function handleSetColor(node: SectionNode, color: string | null) {
    try {
      await setSectionColor(node.id, color);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Došlo je do greške.");
    }
  }

  async function submitDialog() {
    if (!dialog) return;

    setIsPending(true);
    try {
      if (dialog.type === "create") {
        await createSection(dialog.parentId, inputValue);
        toast.success("Kategorija je dodata.");
      } else if (dialog.type === "rename") {
        await renameSection(dialog.id, inputValue);
        toast.success("Naziv je izmenjen.");
      } else if (dialog.type === "delete") {
        await deleteSection(dialog.id);
        toast.success("Kategorija je obrisana.");
      }
      setIsPending(false);
      setDialog(null);
    } catch (err) {
      setIsPending(false);
      toast.error(err instanceof Error ? err.message : "Došlo je do greške.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Kategorije</h1>
        <Button onClick={() => openCreate(null, "vrh")}>
          <Plus className="h-4 w-4" />
          Nova kategorija
        </Button>
      </div>

      <div className="rounded-lg border">
        {tree.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Nema još nijedne kategorije.
          </p>
        )}
        {tree.map((node) => (
          <SectionRow
            key={node.id}
            node={node}
            depth={0}
            onAddChild={openCreate}
            onRename={openRename}
            onDelete={openDelete}
            onToggleHidden={handleToggleHidden}
            onToggleGuestVisible={handleToggleGuestVisible}
            onSetColor={handleSetColor}
          />
        ))}
      </div>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          {dialog?.type === "create" && (
            <>
              <DialogHeader>
                <DialogTitle>Nova kategorija</DialogTitle>
                <DialogDescription>
                  Dodaje se unutar: <strong>{dialog.parentName}</strong>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="section-name">Naziv</Label>
                <Input
                  id="section-name"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="npr. Konfiguracija"
                  autoFocus
                />
              </div>
            </>
          )}

          {dialog?.type === "rename" && (
            <>
              <DialogHeader>
                <DialogTitle>Preimenuj kategoriju</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="section-name">Naziv</Label>
                <Input
                  id="section-name"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  autoFocus
                />
              </div>
            </>
          )}

          {dialog?.type === "delete" && (
            <>
              <DialogHeader>
                <DialogTitle>Obriši &quot;{dialog.name}&quot;?</DialogTitle>
                <DialogDescription>
                  {dialog.childCount > 0 || dialog.articleCount > 0 ? (
                    <>
                      Ovo će trajno obrisati {dialog.childCount > 0 && `${dialog.childCount} podkategorija`}
                      {dialog.childCount > 0 && dialog.articleCount > 0 && " i "}
                      {dialog.articleCount > 0 && `${dialog.articleCount} dodatnih fajlova`}. Ova akcija se ne
                      može poništiti.
                    </>
                  ) : (
                    "Ova akcija se ne može poništiti."
                  )}
                </DialogDescription>
              </DialogHeader>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={isPending}>
              Otkaži
            </Button>
            <Button
              variant={dialog?.type === "delete" ? "destructive" : "default"}
              onClick={submitDialog}
              disabled={isPending || (dialog?.type !== "delete" && inputValue.trim() === "")}
            >
              {dialog?.type === "delete" ? "Obriši" : "Sačuvaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionRow({
  node,
  depth,
  onAddChild,
  onRename,
  onDelete,
  onToggleHidden,
  onToggleGuestVisible,
  onSetColor,
}: {
  node: SectionNode;
  depth: number;
  onAddChild: (parentId: string | null, parentName: string) => void;
  onRename: (id: string, currentName: string) => void;
  onDelete: (node: SectionNode) => void;
  onToggleHidden: (node: SectionNode) => void;
  onToggleGuestVisible: (node: SectionNode) => void;
  onSetColor: (node: SectionNode, color: string | null) => void;
}) {
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div
        className="flex items-center justify-between gap-2 border-b px-3 py-2 last:border-b-0 hover:bg-muted/50"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <FolderTree
            className={`h-4 w-4 shrink-0 ${node.color ? "" : "text-muted-foreground"}`}
            style={node.color ? { color: node.color } : undefined}
          />
          <span className="truncate text-sm font-medium">{node.name}</span>
          {node.hidden && (
            <span className="flex shrink-0 items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              <EyeOff className="h-3 w-3" />
              skriveno
            </span>
          )}
          {node.guestVisible && (
            <span className="flex shrink-0 items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
              <Users className="h-3 w-3" />
              guest
            </span>
          )}
          <span className="shrink-0 text-xs text-muted-foreground">
            {countArticlesDeep(node)} čl.
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Boja ikonice kategorije"
            onClick={() => colorInputRef.current?.click()}
            style={node.color ? { color: node.color } : undefined}
          >
            <Palette className="h-3.5 w-3.5" />
          </Button>
          <input
            ref={colorInputRef}
            type="color"
            value={node.color ?? "#6b7280"}
            onChange={(e) => onSetColor(node, e.target.value)}
            className="sr-only"
          />
          {node.color && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Ukloni boju"
              onClick={() => onSetColor(node, null)}
            >
              <span className="text-xs text-muted-foreground">×</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={node.guestVisible ? "Ukloni Guest vidljivost" : "Dozvoli Guest nalozima"}
            onClick={() => onToggleGuestVisible(node)}
          >
            <Users className={`h-3.5 w-3.5 ${node.guestVisible ? "text-primary" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={node.hidden ? "Otkrij" : "Sakrij"}
            onClick={() => onToggleHidden(node)}
          >
            {node.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Dodaj podkategoriju"
            onClick={() => onAddChild(node.id, node.name)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Preimenuj"
            onClick={() => onRename(node.id, node.name)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Obriši"
            onClick={() => onDelete(node)}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      {node.children.map((child) => (
        <SectionRow
          key={child.id}
          node={child}
          depth={depth + 1}
          onAddChild={onAddChild}
          onRename={onRename}
          onDelete={onDelete}
          onToggleHidden={onToggleHidden}
          onToggleGuestVisible={onToggleGuestVisible}
          onSetColor={onSetColor}
        />
      ))}
    </div>
  );
}
