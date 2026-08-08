"use client";

import { useEffect, useRef, useState } from "react";
import { StickyNote, Lock, X, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { blockIdFor } from "@/lib/block-id";
import type { ArticleNoteDto } from "@/lib/notes";
import {
  addArticleBlockNote,
  updateArticleNote,
  deleteArticleNote,
} from "@/app/(shell)/kategorija/[id]/clanak/[articleId]/note-actions";

const BLOCK_SELECTOR = "p, h1, h2, h3, h4, ul, ol, blockquote, table";

type PopoverState =
  | { kind: "view"; note: ArticleNoteDto; rect: DOMRect }
  | { kind: "create"; blockId: string; rect: DOMRect };

export function ArticleContentWithNotes({
  html,
  notes,
  articleId,
  sectionId,
  canAddNotes,
}: {
  html: string;
  notes: ArticleNoteDto[];
  articleId: string;
  sectionId: string;
  canAddNotes: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cleanups: (() => void)[] = [];
    const usedNoteIds = new Set<string>();

    function addMarker(before: Element, note: ArticleNoteDto) {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = [
        "note-marker",
        note.visibility === "ADMIN_ONLY" ? "note-marker-admin" : "note-marker-user",
      ].join(" ");
      marker.setAttribute("aria-label", "Prikaži napomenu");
      marker.innerHTML =
        note.visibility === "ADMIN_ONLY"
          ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
          : '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
      marker.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = marker.getBoundingClientRect();
        setIsEditing(false);
        setPopover((cur) =>
          cur?.kind === "view" && cur.note.id === note.id ? null : { kind: "view", note, rect },
        );
      };
      before.insertAdjacentElement("beforebegin", marker);
      cleanups.push(() => marker.remove());
    }

    // 1) Napomene vezane za precizan deo teksta (admin selekcija u editoru)
    const spans = container.querySelectorAll<HTMLElement>("[data-note-id]");
    const byAnchor = new Map(notes.map((n) => [n.anchorId, n]));
    spans.forEach((span) => {
      const anchorId = span.getAttribute("data-note-id");
      const note = anchorId ? byAnchor.get(anchorId) : undefined;
      if (!note) return;
      usedNoteIds.add(note.id);
      addMarker(span, note);
    });

    // 2) Napomene vezane za pasus (blockId) - dodate iz prikaza clanka bez write pristupa
    const byBlock = new Map<string, ArticleNoteDto[]>();
    for (const n of notes) {
      if (usedNoteIds.has(n.id) || !n.blockId) continue;
      byBlock.set(n.blockId, [...(byBlock.get(n.blockId) ?? []), n]);
    }

    const blocks = container.querySelectorAll<HTMLElement>(BLOCK_SELECTOR);
    blocks.forEach((block) => {
      if (block.parentElement !== container) return; // samo top-level blokovi
      const blockId = blockIdFor(block.textContent ?? "");
      block.dataset.blockId = blockId;

      for (const note of byBlock.get(blockId) ?? []) {
        addMarker(block, note);
      }

      if (canAddNotes) {
        block.classList.add("note-block-hoverable");
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "note-add-btn";
        addBtn.setAttribute("aria-label", "Dodaj napomenu");
        addBtn.innerHTML =
          '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>';
        addBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = block.getBoundingClientRect();
          setDraftBody("");
          setIsEditing(false);
          setPopover({ kind: "create", blockId, rect });
        };
        block.appendChild(addBtn);
        cleanups.push(() => addBtn.remove());
      }
    });

    return () => cleanups.forEach((fn) => fn());
  }, [html, notes, canAddNotes]);

  useEffect(() => {
    if (!popover) return;
    function onScrollOrResize() {
      setPopover(null);
    }
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [popover]);

  async function submitCreate() {
    if (popover?.kind !== "create") return;
    if (!draftBody.trim()) {
      toast.error("Napomena ne može biti prazna.");
      return;
    }
    setIsSaving(true);
    try {
      await addArticleBlockNote(articleId, sectionId, popover.blockId, draftBody.trim());
      toast.success("Napomena je dodata.");
      setPopover(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitEdit() {
    if (popover?.kind !== "view") return;
    if (!draftBody.trim()) {
      toast.error("Napomena ne može biti prazna.");
      return;
    }
    setIsSaving(true);
    try {
      await updateArticleNote(articleId, sectionId, popover.note.id, draftBody.trim());
      toast.success("Napomena je izmenjena.");
      setPopover(null);
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitDelete() {
    if (popover?.kind !== "view") return;
    setIsSaving(true);
    try {
      await deleteArticleNote(articleId, sectionId, popover.note.id);
      toast.success("Napomena je obrisana.");
      setPopover(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška.");
    } finally {
      setIsSaving(false);
    }
  }

  const isAdminNote = popover?.kind === "view" && popover.note.visibility === "ADMIN_ONLY";
  const popoverStyle = popover
    ? {
        top: popover.rect.top + window.scrollY,
        left: Math.max(8, popover.rect.left + window.scrollX - 296),
      }
    : undefined;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {popover && (
        <div
          className={`fixed z-40 w-72 rounded-lg border p-3 text-sm shadow-lg ${
            popover.kind === "create"
              ? "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950"
              : isAdminNote
                ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
                : "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950"
          }`}
          style={popoverStyle}
        >
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span
              className={`flex items-center gap-1 text-xs font-medium ${
                isAdminNote ? "text-amber-700 dark:text-amber-400" : "text-sky-700 dark:text-sky-400"
              }`}
            >
              {popover.kind === "create" ? (
                <Plus className="h-3 w-3" />
              ) : isAdminNote ? (
                <Lock className="h-3 w-3" />
              ) : (
                <StickyNote className="h-3 w-3" />
              )}
              {popover.kind === "create"
                ? "Nova napomena"
                : isAdminNote
                  ? "Interna napomena"
                  : "Napomena"}
            </span>
            <button
              type="button"
              onClick={() => setPopover(null)}
              aria-label="Zatvori"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {popover.kind === "create" && (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                rows={3}
                className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Napiši napomenu..."
              />
              <button
                type="button"
                onClick={submitCreate}
                disabled={isSaving}
                className="w-full rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Sačuvaj
              </button>
            </div>
          )}

          {popover.kind === "view" && !isEditing && (
            <>
              <p className="whitespace-pre-wrap text-foreground">{popover.note.body}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">— {popover.note.createdByName}</p>
              {popover.note.canManage && (
                <div className="mt-2 flex gap-2 border-t pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftBody(popover.note.body);
                      setIsEditing(true);
                    }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                    Izmeni
                  </button>
                  <button
                    type="button"
                    onClick={submitDelete}
                    disabled={isSaving}
                    className="flex items-center gap-1 text-xs text-destructive hover:opacity-80"
                  >
                    <Trash2 className="h-3 w-3" />
                    Obriši
                  </button>
                </div>
              )}
            </>
          )}

          {popover.kind === "view" && isEditing && (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                rows={3}
                className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50"
                >
                  Otkaži
                </button>
                <button
                  type="button"
                  onClick={submitEdit}
                  disabled={isSaving}
                  className="flex-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Sačuvaj
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
