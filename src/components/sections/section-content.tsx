"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArticleEditor } from "@/components/articles/article-editor";
import { updateSectionContent } from "@/lib/actions/sections";

export function SectionContent({
  sectionId,
  initialContentHtml,
  canWrite,
  isAdmin,
  updatedLabel,
}: {
  sectionId: string;
  initialContentHtml: string | null;
  canWrite: boolean;
  isAdmin: boolean;
  updatedLabel: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(initialContentHtml);
  const [draft, setDraft] = useState(initialContentHtml ?? "");
  const [isSaving, setIsSaving] = useState(false);

  function isBlankHtml(html: string) {
    return html.replace(/<[^>]+>/g, "").trim().length === 0;
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateSectionContent(sectionId, draft);
      setSaved(isBlankHtml(draft) ? null : draft);
      setEditing(false);
      toast.success("Sadržaj je sačuvan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri čuvanju.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setDraft(saved ?? "");
    setEditing(false);
  }

  // Kad podkategorija jos nema sadrzaj, a korisnik sme da pise, editor je odmah
  // otvoren i spreman za kucanje - bez dodatnog klika na dugme.
  const showEditor = editing || (canWrite && !saved);

  if (showEditor) {
    return (
      <div className="space-y-2">
        <ArticleEditor content={draft} onChange={setDraft} isAdmin={isAdmin} />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4" />
            {isSaving ? "Čuvanje..." : "Sačuvaj"}
          </Button>
          {saved && (
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving}>
              <X className="h-4 w-4" />
              Otkaži
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!saved) return null;

  return (
    <div className="space-y-2">
      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: saved }}
      />
      <div className="flex items-center justify-between gap-2">
        {updatedLabel && <p className="text-xs text-muted-foreground">{updatedLabel}</p>}
        {canWrite && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            Uredi sadržaj
          </Button>
        )}
      </div>
    </div>
  );
}
