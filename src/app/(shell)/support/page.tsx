import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, LifeBuoy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { getMyTickets } from "@/lib/support";
import { DeleteTicketButton } from "@/components/support/delete-ticket-button";
import { STATUS_LABEL, CATEGORY_LABEL } from "@/lib/support-labels";

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user) notFound();

  const tickets = await getMyTickets(session.user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-semibold tracking-tight">
          <LifeBuoy className="h-6 w-6" />
          Support
        </h1>
        <Button render={<Link href="/support/novi" />}>
          <Plus className="h-4 w-4" />
          Novi zahtev
        </Button>
      </div>

      {tickets.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nemaš još nijedan zahtev. Klikni &quot;Novi zahtev&quot; ako imaš problem ili predlog.
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-1 px-4 py-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <Link href={`/support/${t.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{t.title}</span>
                  <Badge variant="secondary">{STATUS_LABEL[t.status]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{CATEGORY_LABEL[t.category]}</p>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("sr-RS", { dateStyle: "medium", timeStyle: "short" }).format(
                    t.lastActivityAt,
                  )}
                </span>
                <DeleteTicketButton ticketId={t.id} title={t.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
