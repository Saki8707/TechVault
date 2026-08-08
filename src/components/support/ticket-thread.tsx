"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Send, Paperclip, X, Download, Trash2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import type { TicketDto } from "@/lib/support";
import type { TicketStatus } from "@prisma/client";
import { STATUS_LABEL, STATUS_OPTIONS, CATEGORY_LABEL, PRIORITY_LABEL } from "@/lib/support-labels";
import { addMessageAction, setTicketStatusAction, deleteTicketAction } from "@/lib/actions/support";

async function uploadAttachment(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/uploads/support", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Greška pri otpremanju priloga.");
  return data as { path: string; filename: string; mimeType: string; size: number };
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("sr-RS", { dateStyle: "long", timeStyle: "short" }).format(d);
}

export function TicketThread({
  ticket,
  isAdmin,
  currentUserId,
}: {
  ticket: TicketDto;
  isAdmin: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteTicketAction(ticket.id);
    } catch (err) {
      if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
      setIsDeleting(false);
      toast.error(err instanceof Error ? err.message : "Greška pri brisanju.");
    }
  }

  async function handleSend() {
    if (!body.trim()) {
      toast.error("Poruka ne može biti prazna.");
      return;
    }
    setIsSending(true);
    try {
      const attachment = file ? await uploadAttachment(file) : null;
      await addMessageAction(ticket.id, body, attachment);
      setBody("");
      setFile(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri slanju poruke.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleStatusChange(status: TicketStatus) {
    setIsChangingStatus(true);
    try {
      await setTicketStatusAction(ticket.id, status);
      toast.success("Status je promenjen.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri promeni statusa.");
    } finally {
      setIsChangingStatus(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link href="/support" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Nazad na Support
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight break-words">{ticket.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {isAdmin && `${ticket.userName} · `}
            {CATEGORY_LABEL[ticket.category]} · Prioritet: {PRIORITY_LABEL[ticket.priority]} ·{" "}
            {formatDate(ticket.createdAt)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isAdmin ? (
            <Select value={ticket.status} onValueChange={(v) => handleStatusChange(v as TicketStatus)}>
              <SelectTrigger className="w-40" disabled={isChangingStatus}>
                <SelectValue>{(v: TicketStatus) => STATUS_LABEL[v]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="secondary">{STATUS_LABEL[ticket.status]}</Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Obriši razgovor"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obriši ovaj razgovor?</DialogTitle>
            <DialogDescription>
              Sve poruke i prilozi u ovom Support zahtevu će biti trajno obrisani. Ova akcija se ne
              može poništiti.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={isDeleting}>
              Otkaži
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Brisanje..." : "Obriši"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {ticket.messages.map((m) => {
          const isMine = m.senderId === currentUserId;
          return (
            <div
              key={m.id}
              className={`flex gap-2.5 ${isMine ? "flex-row-reverse" : ""}`}
            >
              <Avatar className="h-8 w-8 shrink-0">
                {m.senderAvatar && <AvatarImage src={m.senderAvatar} alt={m.senderName} />}
                <AvatarFallback className="bg-gradient-to-br from-brand-from to-brand-to text-xs text-white">
                  {m.senderName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[80%] space-y-1 ${isMine ? "items-end text-right" : ""}`}>
                <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isMine ? "flex-row-reverse" : ""}`}>
                  <span className="font-medium text-foreground">{m.senderName}</span>
                  <span>{formatDate(m.createdAt)}</span>
                </div>
                <div
                  className={`inline-block rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap ${
                    isMine ? "bg-primary/10" : "bg-muted/50"
                  }`}
                >
                  {m.body}
                  {m.attachmentPath && (
                    <a
                      href={`/api/support/attachment/${m.id}`}
                      className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {m.attachmentFilename}
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Napiši poruku..."
        />
        <div className="flex items-center justify-between gap-2">
          <div>
            {file ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" />
                <span className="max-w-40 truncate">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} aria-label="Ukloni prilog">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
                Prilog
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
          <Button type="button" size="sm" onClick={handleSend} disabled={isSending}>
            <Send className="h-4 w-4" />
            {isSending ? "Slanje..." : "Pošalji"}
          </Button>
        </div>
      </div>
    </div>
  );
}
