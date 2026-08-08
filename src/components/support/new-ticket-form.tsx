"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TicketCategory, TicketPriority } from "@prisma/client";
import { CATEGORY_LABEL, CATEGORY_OPTIONS, PRIORITY_LABEL, PRIORITY_OPTIONS } from "@/lib/support-labels";
import { createTicketAction } from "@/lib/actions/support";

async function uploadAttachment(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/uploads/support", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Greška pri otpremanju priloga.");
  return data as { path: string; filename: string; mimeType: string; size: number };
}

export function NewTicketForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TicketCategory>("OTHER");
  const [priority, setPriority] = useState<TicketPriority>("NORMAL");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Naslov i opis su obavezni.");
      return;
    }

    setIsSubmitting(true);
    try {
      const attachment = file ? await uploadAttachment(file) : null;
      await createTicketAction({ title, category, priority, body, attachment });
    } catch (err) {
      if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
      setIsSubmitting(false);
      toast.error(err instanceof Error ? err.message : "Greška pri slanju zahteva.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Naslov problema</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Kratko opiši problem"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Kategorija</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: TicketCategory) => CATEGORY_LABEL[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Prioritet</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: TicketPriority) => PRIORITY_LABEL[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Detaljan opis problema</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          placeholder="Opiši šta se dešava, kada se pojavljuje, i sve što bi nam pomoglo da razumemo problem..."
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Prilog (opciono)</Label>
        {file ? (
          <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{file.name}</span>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="ml-auto text-muted-foreground hover:text-foreground"
              aria-label="Ukloni prilog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
            Dodaj sliku ili fajl
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        <Send className="h-4 w-4" />
        {isSubmitting ? "Slanje..." : "Pošalji zahtev"}
      </Button>
    </form>
  );
}
