"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Smile, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EMOJI_CATEGORIES } from "@/lib/emoji-data";

type CustomEmoji = { id: string; name: string; url: string };

export function EmojiPicker({
  isAdmin,
  onSelect,
}: {
  isAdmin: boolean;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"emoji" | "custom">("emoji");
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState<CustomEmoji[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    fetch("/api/emoji")
      .then((r) => r.json())
      .then((data) => setCustom(data.emoji ?? []))
      .catch(() => {});
  }, [open]);

  async function handleUploadCustom(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const name = window.prompt("Ime za ovaj emoji (kratko, bez razmaka):");
    if (!name) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/uploads/image", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? "Greška pri otpremanju.");

      const res = await fetch("/api/emoji", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url: uploadData.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Greška.");
      setCustom((prev) => [data, ...prev]);
      toast.success("Emoji je dodat.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteCustom(id: string) {
    try {
      await fetch(`/api/emoji/${id}`, { method: "DELETE" });
      setCustom((prev) => prev.filter((e) => e.id !== id));
    } catch {
      toast.error("Greška pri brisanju.");
    }
  }

  const filteredCustom = query
    ? custom.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
    : custom;

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Emoji"
        onClick={() => setOpen((v) => !v)}
      >
        <Smile className="h-3.5 w-3.5" />
      </Button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-80 rounded-lg border bg-popover text-popover-foreground shadow-lg">
          <div className="flex items-center gap-1 border-b p-2">
            <button
              type="button"
              onClick={() => setTab("emoji")}
              className={`rounded-md px-2 py-1 text-xs font-medium ${tab === "emoji" ? "bg-muted" : "text-muted-foreground hover:bg-muted/50"}`}
            >
              Emoji
            </button>
            <button
              type="button"
              onClick={() => setTab("custom")}
              className={`rounded-md px-2 py-1 text-xs font-medium ${tab === "custom" ? "bg-muted" : "text-muted-foreground hover:bg-muted/50"}`}
            >
              Custom
            </button>
            {tab === "custom" && (
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pretraži..."
                className="ml-auto w-24 rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            )}
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {tab === "emoji" ? (
              EMOJI_CATEGORIES.map((cat) => (
                <div key={cat.label} className="mb-2">
                  <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">{cat.label}</p>
                  <div className="grid grid-cols-8 gap-0.5">
                    {cat.emoji.map((e, i) => (
                      <button
                        key={`${e}-${i}`}
                        type="button"
                        onClick={() => {
                          onSelect(e);
                          setOpen(false);
                        }}
                        className="rounded-md p-1.5 text-xl hover:bg-muted"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-2">
                {isAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isUploading ? "Otpremanje..." : "Dodaj custom emoji"}
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadCustom}
                />
                {filteredCustom.length === 0 ? (
                  <p className="px-1 text-xs text-muted-foreground">
                    {isAdmin ? "Još nema custom emoji-ja." : "Nema custom emoji-ja."}
                  </p>
                ) : (
                  <div className="grid grid-cols-6 gap-1">
                    {filteredCustom.map((e) => (
                      <div key={e.id} className="group relative">
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(e.url);
                            setOpen(false);
                          }}
                          title={e.name}
                          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={e.url} alt={e.name} className="h-6 w-6 object-contain" />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustom(e.id)}
                            aria-label="Obriši"
                            className="absolute -top-1 -right-1 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
