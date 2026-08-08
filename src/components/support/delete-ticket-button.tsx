"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteTicketAction } from "@/lib/actions/support";

export function DeleteTicketButton({ ticketId, title }: { ticketId: string; title: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Obrisati zahtev "${title}"? Ova akcija se ne može poništiti.`)) return;

    startTransition(async () => {
      try {
        await deleteTicketAction(ticketId);
      } catch (err) {
        if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
        toast.error(err instanceof Error ? err.message : "Greška pri brisanju.");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Obriši razgovor"
      onClick={handleClick}
      disabled={isPending}
    >
      <Trash2 className="h-3.5 w-3.5 text-destructive" />
    </Button>
  );
}
