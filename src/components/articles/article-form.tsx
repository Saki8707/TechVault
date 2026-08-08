"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Save, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArticleEditor, type EditorNote } from "@/components/articles/article-editor";
import type { PendingNote } from "@/lib/notes";
import { createArticle, updateArticle } from "@/lib/actions/articles";

type Props =
  | {
      mode: "create";
      sectionId: string;
      isAdmin: boolean;
      canAddNotes: boolean;
    }
  | {
      mode: "edit";
      articleId: string;
      initialTitle: string;
      initialContentHtml: string;
      initialNotes: EditorNote[];
      initialColor: string | null;
      isAdmin: boolean;
      canAddNotes: boolean;
    };

export function ArticleForm(props: Props) {
  const [title, setTitle] = useState(props.mode === "edit" ? props.initialTitle : "");
  const [color, setColor] = useState<string | null>(
    props.mode === "edit" ? props.initialColor : null,
  );
  const [content, setContent] = useState(
    props.mode === "edit" ? props.initialContentHtml : "",
  );
  const [notes, setNotes] = useState<Map<string, EditorNote>>(
    new Map(
      props.mode === "edit" ? props.initialNotes.map((n) => [n.anchorId, n]) : [],
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Naslov je obavezan.");
      return;
    }

    const notesList: PendingNote[] = [...notes.values()].map((n) => ({
      anchorId: n.anchorId,
      body: n.body,
      visibility: n.visibility,
    }));

    setIsSaving(true);
    try {
      if (props.mode === "create") {
        await createArticle(props.sectionId, title, content, notesList, color);
      } else {
        await updateArticle(props.articleId, title, content, notesList, color);
      }
    } catch (err) {
      // NEXT_REDIRECT se baca pri uspehu i mora da nastavi kroz Next.js - nije prava greska
      if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
      setIsSaving(false);
      toast.error(err instanceof Error ? err.message : "Greška pri čuvanju.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Naslov</Label>
        <div className="flex items-center gap-2">
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Naslov članka"
            required
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Boja ikonice članka"
            onClick={() => colorInputRef.current?.click()}
            style={color ? { color } : undefined}
            title="Boja ikonice članka u listama"
          >
            <Palette className="h-4 w-4" />
          </Button>
          <input
            ref={colorInputRef}
            type="color"
            value={color ?? "#6b7280"}
            onChange={(e) => setColor(e.target.value)}
            className="sr-only"
          />
          {color && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setColor(null)}
              className="text-xs text-muted-foreground"
            >
              Ukloni boju
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Sadržaj</Label>
        <ArticleEditor
          content={content}
          onChange={setContent}
          isAdmin={props.isAdmin}
          canAddNotes={props.canAddNotes}
          notes={notes}
          onNotesChange={setNotes}
        />
      </div>

      <Button type="submit" disabled={isSaving}>
        <Save className="h-4 w-4" />
        {isSaving ? "Čuvanje..." : "Sačuvaj"}
      </Button>
    </form>
  );
}
