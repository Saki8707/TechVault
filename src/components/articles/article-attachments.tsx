"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Paperclip, Download, Trash2, Upload, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AttachmentItem = {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  color?: string | null;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ArticleAttachments({
  articleId,
  initialAttachments,
  canWrite,
}: {
  articleId: string;
  initialAttachments: AttachmentItem[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [attachments, setAttachments] = useState(initialAttachments);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadColor, setUploadColor] = useState("#6b7280");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("articleId", articleId);
    formData.append("color", uploadColor);

    setIsUploading(true);
    try {
      const res = await fetch("/api/attachments", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Greška pri otpremanju.");
      setAttachments((prev) => [...prev, data]);
      toast.success("Prilog je otpremljen.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri otpremanju.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Greška pri brisanju.");
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      toast.success("Prilog je obrisan.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri brisanju.");
    }
  }

  if (attachments.length === 0 && !canWrite) return null;

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-medium">
          <Paperclip className="h-4 w-4" />
          Prilozi
        </h3>
        {canWrite && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Boja ikonice sledećeg priloga"
              onClick={() => colorInputRef.current?.click()}
              style={{ color: uploadColor }}
            >
              <Palette className="h-3.5 w-3.5" />
            </Button>
            <input
              ref={colorInputRef}
              type="color"
              value={uploadColor}
              onChange={(e) => setUploadColor(e.target.value)}
              className="sr-only"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              {isUploading ? "Otpremanje..." : "Dodaj prilog"}
            </Button>
          </div>
        )}
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      {attachments.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nema priloga.</p>
      ) : (
        <ul className="space-y-1">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
            >
              <a
                href={`/api/attachments/${a.id}`}
                className="flex min-w-0 flex-1 items-center gap-2 text-foreground hover:underline"
              >
                <Download
                  className={`h-3.5 w-3.5 shrink-0 ${a.color ? "" : "text-muted-foreground"}`}
                  style={a.color ? { color: a.color } : undefined}
                />
                <span className="truncate">{a.filename}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatSize(a.size)}
                </span>
              </a>
              {canWrite && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Obriši prilog"
                  onClick={() => handleDelete(a.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
