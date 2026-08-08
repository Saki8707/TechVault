"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapLink from "@tiptap/extension-link";
import { ResizableImage } from "@/components/articles/resizable-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import { TagMention } from "@/components/articles/tag-mention";
import { NoteAnchor } from "@/components/articles/note-anchor";
import { BlockBackground, setBlockBackground } from "@/components/articles/block-background";
import { EmojiPicker } from "@/components/articles/emoji-picker";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { NoteVisibility } from "@prisma/client";
import type { PendingNote } from "@/lib/notes";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Table as TableIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Rows3,
  Columns3,
  Trash2,
  Combine,
  StickyNote,
  Baseline,
  Highlighter,
  PaintBucket,
  Eraser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export type EditorNote = PendingNote & { canManage?: boolean };

const FONT_OPTIONS = [
  { label: "Podrazumevani font", value: "" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/uploads/image", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Greška pri otpremanju slike.");
  return data.url as string;
}

export function ArticleEditor({
  content,
  onChange,
  isAdmin = false,
  canAddNotes = false,
  notes,
  onNotesChange,
}: {
  content: string;
  onChange: (html: string) => void;
  isAdmin?: boolean;
  canAddNotes?: boolean;
  notes?: Map<string, EditorNote>;
  onNotesChange?: (updater: (prev: Map<string, EditorNote>) => Map<string, EditorNote>) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textColorRef = useRef<HTMLInputElement>(null);
  const highlightColorRef = useRef<HTMLInputElement>(null);
  const blockColorRef = useRef<HTMLInputElement>(null);
  const [noteDialog, setNoteDialog] = useState<{
    mode: "create" | "edit";
    anchorId: string;
    body: string;
    visibility: NoteVisibility;
  } | null>(null);
  const [tableDialog, setTableDialog] = useState<{ rows: number; cols: number } | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: false }),
      ResizableImage,
      Placeholder.configure({ placeholder: "Napiši sadržaj... (kucaj # za tag)" }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      BlockBackground,
      TagMention,
      NoteAnchor,
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[300px] focus:outline-none px-3 py-2",
      },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length > 0) {
          event.preventDefault();
          for (const file of files) {
            uploadImage(file)
              .then((url) => {
                const { schema, selection } = view.state;
                const node = schema.nodes.image.create({ src: url });
                view.dispatch(view.state.tr.insert(selection.to, node));
              })
              .catch((err) => {
                toast.error(err instanceof Error ? err.message : "Greška pri otpremanju slike.");
              });
          }
          return true;
        }

        // Nalepljivanje iz Excela/tabele: HTML sadrzaj vec ima <table> i ProseMirror ga
        // ispravno parsira po sablonu naseg Table extension-a (podrazumevano ponasanje).
        // Kad je samo prost tekst sa tabovima (bez HTML tabele), rucno napravi tabelu.
        const html = event.clipboardData?.getData("text/html") ?? "";
        const text = event.clipboardData?.getData("text/plain") ?? "";
        if (/<table/i.test(html) || !text.includes("\t")) return false;

        const rows = text
          .replace(/\r/g, "")
          .split("\n")
          .filter((r) => r.length > 0)
          .map((r) => r.split("\t"));
        if (rows.length === 0) return false;

        event.preventDefault();
        const { schema } = view.state;
        const colCount = Math.max(...rows.map((r) => r.length));
        const tableRows = rows.map((cols, ri) => {
          const cellType = ri === 0 ? schema.nodes.tableHeader : schema.nodes.tableCell;
          const cells = Array.from({ length: colCount }, (_, ci) => cols[ci] ?? "");
          return schema.nodes.tableRow.create(
            null,
            cells.map((cellText) =>
              cellType.create(
                null,
                cellText
                  ? schema.nodes.paragraph.create(null, schema.text(cellText))
                  : schema.nodes.paragraph.create(),
              ),
            ),
          );
        });
        const table = schema.nodes.table.create(null, tableRows);
        view.dispatch(view.state.tr.replaceSelectionWith(table));
        return true;
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length === 0) return false;
        event.preventDefault();

        const coords = { left: event.clientX, top: event.clientY };
        const dropPos = view.posAtCoords(coords)?.pos ?? view.state.selection.to;

        for (const file of files) {
          uploadImage(file)
            .then((url) => {
              const { schema } = view.state;
              const node = schema.nodes.image.create({ src: url });
              view.dispatch(view.state.tr.insert(dropPos, node));
            })
            .catch((err) => {
              toast.error(err instanceof Error ? err.message : "Greška pri otpremanju slike.");
            });
        }
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;

    try {
      const url = await uploadImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri otpremanju slike.");
    }
  }

  function insertLink() {
    if (!editor) return;
    const url = window.prompt("Unesi link (URL):");
    if (!url) return;
    editor.chain().focus().setLink({ href: url }).run();
  }

  function openTableDialog() {
    setTableDialog({ rows: 5, cols: 5 });
  }

  function confirmInsertTable() {
    if (!editor || !tableDialog) return;
    const rows = Math.min(Math.max(tableDialog.rows, 1), 50);
    const cols = Math.min(Math.max(tableDialog.cols, 1), 25);
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setTableDialog(null);
  }

  function openNoteDialog() {
    if (!editor) return;
    if (editor.isActive("noteAnchor")) {
      const existingId = editor.getAttributes("noteAnchor").noteId as string;
      const existing = notes?.get(existingId);
      if (existing && existing.canManage === false) {
        toast.error("Nemate dozvolu da menjate ovu napomenu.");
        return;
      }
      setNoteDialog({
        mode: "edit",
        anchorId: existingId,
        body: existing?.body ?? "",
        visibility: existing?.visibility ?? "ADMIN_ONLY",
      });
    } else {
      if (editor.state.selection.empty) {
        toast.error("Prvo selektuj deo teksta za napomenu.");
        return;
      }
      setNoteDialog({
        mode: "create",
        anchorId: crypto.randomUUID(),
        body: "",
        visibility: isAdmin ? "ADMIN_ONLY" : "ALL_USERS",
      });
    }
  }

  function saveNoteDialog() {
    if (!editor || !noteDialog) return;
    if (!noteDialog.body.trim()) {
      toast.error("Napomena ne može biti prazna.");
      return;
    }
    if (noteDialog.mode === "create") {
      editor.chain().focus().setMark("noteAnchor", { noteId: noteDialog.anchorId }).run();
    }
    const visibility = isAdmin ? noteDialog.visibility : "ALL_USERS";
    onNotesChange?.((prev) => {
      const next = new Map(prev);
      next.set(noteDialog.anchorId, {
        anchorId: noteDialog.anchorId,
        body: noteDialog.body.trim(),
        visibility,
        canManage: true,
      });
      return next;
    });
    setNoteDialog(null);
  }

  function deleteNoteDialog() {
    if (!editor || !noteDialog) return;
    editor.chain().focus().extendMarkRange("noteAnchor").unsetMark("noteAnchor").run();
    onNotesChange?.((prev) => {
      const next = new Map(prev);
      next.delete(noteDialog.anchorId);
      return next;
    });
    setNoteDialog(null);
  }

  if (!editor) return null;

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1">
        <select
          aria-label="Font"
          value={(editor.getAttributes("textStyle").fontFamily as string | undefined) ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            if (!value) {
              editor.chain().focus().unsetFontFamily().run();
            } else {
              editor.chain().focus().setFontFamily(value).run();
            }
          }}
          className="h-7 rounded-md border bg-background px-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Podebljano"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Kurziv"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="Naslov 2"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          label="Naslov 3"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Lista"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Numerisana lista"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          label="Citat"
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ToolbarButton
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          label="Poravnaj levo"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          label="Poravnaj na sredinu"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          label="Poravnaj desno"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ToolbarButton onClick={() => textColorRef.current?.click()} label="Boja teksta">
          <Baseline className="h-3.5 w-3.5" />
        </ToolbarButton>
        <input
          ref={textColorRef}
          type="color"
          className="sr-only"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetColor().run()}
          label="Ukloni boju teksta"
        >
          <Eraser className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => highlightColorRef.current?.click()} label="Boja isticanja teksta">
          <Highlighter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <input
          ref={highlightColorRef}
          type="color"
          className="sr-only"
          onChange={(e) => editor.chain().focus().setHighlight({ color: e.target.value }).run()}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetHighlight().run()}
          label="Ukloni isticanje"
        >
          <Eraser className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => blockColorRef.current?.click()} label="Boja pozadine bloka">
          <PaintBucket className="h-3.5 w-3.5" />
        </ToolbarButton>
        <input
          ref={blockColorRef}
          type="color"
          className="sr-only"
          onChange={(e) => setBlockBackground(editor, e.target.value)}
        />
        <ToolbarButton
          onClick={() => setBlockBackground(editor, null)}
          label="Ukloni pozadinu bloka"
        >
          <Eraser className="h-3.5 w-3.5" />
        </ToolbarButton>
        <EmojiPicker
          isAdmin={isAdmin}
          onSelect={(value) => {
            if (value.startsWith("http") || value.startsWith("/")) {
              editor.chain().focus().setImage({ src: value, alt: "emoji" }).run();
            } else {
              editor.chain().focus().insertContent(value).run();
            }
          }}
        />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ToolbarButton onClick={openTableDialog} label="Ubaci tabelu">
          <TableIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => fileInputRef.current?.click()} label="Ubaci sliku">
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={insertLink} label="Ubaci link">
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        {canAddNotes && (
          <>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <ToolbarButton
              active={editor.isActive("noteAnchor")}
              onClick={openNoteDialog}
              label="Napomena na tekstu"
            >
              <StickyNote className="h-3.5 w-3.5" />
            </ToolbarButton>
          </>
        )}
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} label="Poništi">
          <Undo className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} label="Ponovi">
          <Redo className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {editor.isActive("table") && (
        <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/20 p-1">
          <span className="px-1.5 text-xs text-muted-foreground">Tabela:</span>
          <ToolbarButton
            onClick={() => editor.chain().focus().addRowAfter().run()}
            label="Dodaj red"
          >
            <Rows3 className="h-3.5 w-3.5" />+
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteRow().run()}
            label="Obriši red"
          >
            <Rows3 className="h-3.5 w-3.5" />−
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            label="Dodaj kolonu"
          >
            <Columns3 className="h-3.5 w-3.5" />+
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteColumn().run()}
            label="Obriši kolonu"
          >
            <Columns3 className="h-3.5 w-3.5" />−
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().mergeOrSplit().run()}
            label="Spoji/razdvoji ćelije"
          >
            <Combine className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteTable().run()}
            label="Obriši tabelu"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </ToolbarButton>
        </div>
      )}

      <div className="overflow-x-auto">
        <EditorContent editor={editor} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelected}
      />

      <Dialog open={noteDialog !== null} onOpenChange={(open) => !open && setNoteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              {noteDialog?.mode === "create" ? "Nova napomena" : "Izmeni napomenu"}
            </DialogTitle>
            <DialogDescription>
              Napomena je vezana za selektovani deo teksta, ne za ceo dodatni fajl.
            </DialogDescription>
          </DialogHeader>

          {noteDialog && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note-body">Tekst napomene</Label>
                <Textarea
                  id="note-body"
                  rows={4}
                  value={noteDialog.body}
                  onChange={(e) => setNoteDialog({ ...noteDialog, body: e.target.value })}
                  autoFocus
                />
              </div>

              {isAdmin ? (
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <Label htmlFor="note-visibility">Vidljivo svim korisnicima</Label>
                    <p className="text-xs text-muted-foreground">
                      Isključeno = interna napomena, vidi je samo admin
                    </p>
                  </div>
                  <Switch
                    id="note-visibility"
                    checked={noteDialog.visibility === "ALL_USERS"}
                    onCheckedChange={(checked) =>
                      setNoteDialog({
                        ...noteDialog,
                        visibility: checked ? "ALL_USERS" : "ADMIN_ONLY",
                      })
                    }
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Napomena će biti vidljiva svim korisnicima.</p>
              )}
            </div>
          )}

          <DialogFooter className="flex-row justify-between sm:justify-between">
            {noteDialog?.mode === "edit" ? (
              <Button variant="destructive" size="sm" onClick={deleteNoteDialog}>
                <Trash2 className="h-3.5 w-3.5" />
                Obriši
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setNoteDialog(null)}>
                Otkaži
              </Button>
              <Button onClick={saveNoteDialog}>Sačuvaj</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tableDialog !== null} onOpenChange={(open) => !open && setTableDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TableIcon className="h-4 w-4" />
              Ubaci tabelu
            </DialogTitle>
            <DialogDescription>Odredi koliko kolona i redova tabela ima.</DialogDescription>
          </DialogHeader>

          {tableDialog && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="table-cols">Kolone</Label>
                <input
                  id="table-cols"
                  type="number"
                  min={1}
                  max={25}
                  value={tableDialog.cols}
                  onChange={(e) =>
                    setTableDialog({ ...tableDialog, cols: Number(e.target.value) || 1 })
                  }
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-rows">Redovi</Label>
                <input
                  id="table-rows"
                  type="number"
                  min={1}
                  max={50}
                  value={tableDialog.rows}
                  onChange={(e) =>
                    setTableDialog({ ...tableDialog, rows: Number(e.target.value) || 1 })
                  }
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTableDialog(null)}>
              Otkaži
            </Button>
            <Button onClick={confirmInsertTable}>Ubaci</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
