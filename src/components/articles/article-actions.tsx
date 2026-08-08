"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { deleteArticle } from "@/lib/actions/articles";

export function ArticleActions({
  sectionId,
  articleId,
}: {
  sectionId: string;
  articleId: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteArticle(articleId);
    } catch (err) {
      if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
      setIsDeleting(false);
      toast.error(err instanceof Error ? err.message : "Greška pri brisanju.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        render={<Link href={`/kategorija/${sectionId}/clanak/${articleId}/izmeni`} />}
      >
        <Pencil className="h-4 w-4" />
        Izmeni
      </Button>
      <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
        <Trash2 className="h-4 w-4 text-destructive" />
        Obriši
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obriši dodatni fajl?</DialogTitle>
            <DialogDescription>Ova akcija se ne može poništiti.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isDeleting}>
              Otkaži
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              Obriši
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
