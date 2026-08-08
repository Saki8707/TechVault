import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DeleteTicketButton } from "@/components/support/delete-ticket-button";
import { prisma } from "@/lib/prisma";
import { getAllTickets } from "@/lib/support";
import { STATUS_LABEL, STATUS_OPTIONS, CATEGORY_LABEL, CATEGORY_OPTIONS } from "@/lib/support-labels";
import type { TicketStatus, TicketCategory } from "@prisma/client";

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    userId?: string;
    category?: string;
    from?: string;
    to?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;

  const [tickets, users] = await Promise.all([
    getAllTickets({
      status: (params.status as TicketStatus) || undefined,
      userId: params.userId || undefined,
      category: (params.category as TicketCategory) || undefined,
      from: params.from ? new Date(params.from) : undefined,
      to: params.to ? new Date(`${params.to}T23:59:59`) : undefined,
      search: params.q || undefined,
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
        <p className="text-sm text-muted-foreground">
          Svi prijavljeni problemi i predlozi korisnika — {tickets.length} rezultata.
        </p>
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Pretraga</label>
          <input
            type="text"
            name="q"
            defaultValue={params.q}
            placeholder="Naslov..."
            className="h-8 w-40 rounded-md border bg-background px-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Svi</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Kategorija</label>
          <select
            name="category"
            defaultValue={params.category ?? ""}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Sve</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Korisnik</label>
          <select
            name="userId"
            defaultValue={params.userId ?? ""}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Svi</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Od</label>
          <input
            type="date"
            name="from"
            defaultValue={params.from}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Do</label>
          <input
            type="date"
            name="to"
            defaultValue={params.to}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Filtriraj
        </button>
        {(params.q || params.status || params.category || params.userId || params.from || params.to) && (
          <Link
            href="/admin/support"
            className="h-8 rounded-md border px-3 text-sm leading-8 text-muted-foreground hover:bg-muted/50"
          >
            Resetuj
          </Link>
        )}
      </form>

      {tickets.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nema zahteva koji odgovaraju filterima.
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {tickets.map((t) => (
            <div
              key={t.id}
              className={`flex flex-col gap-1 px-4 py-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${
                t.adminUnread ? "bg-primary/5" : ""
              }`}
            >
              <Link href={`/support/${t.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {t.adminUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  <span className={`truncate ${t.adminUnread ? "font-semibold" : "font-medium"}`}>
                    {t.title}
                  </span>
                  <Badge variant="secondary">{STATUS_LABEL[t.status]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t.userName} · {CATEGORY_LABEL[t.category]} · #{t.id.slice(-6)}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right text-xs text-muted-foreground">
                  <p>Poslato: {new Intl.DateTimeFormat("sr-RS", { dateStyle: "medium" }).format(t.createdAt)}</p>
                  <p>
                    Poslednja aktivnost:{" "}
                    {new Intl.DateTimeFormat("sr-RS", { dateStyle: "medium", timeStyle: "short" }).format(
                      t.lastActivityAt,
                    )}
                  </p>
                </div>
                <DeleteTicketButton ticketId={t.id} title={t.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
