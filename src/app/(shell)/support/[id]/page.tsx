import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getTicket, markTicketRead } from "@/lib/support";
import { TicketThread } from "@/components/support/ticket-thread";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) notFound();

  let ticket;
  try {
    ticket = await getTicket(id, { id: session.user.id, role: session.user.role });
  } catch {
    notFound();
  }

  const isAdmin = session.user.role === "ADMIN";
  if (isAdmin) {
    // fire-and-forget - ne blokira renderovanje stranice
    markTicketRead(id, { id: session.user.id, role: session.user.role }).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <TicketThread ticket={ticket} isAdmin={isAdmin} currentUserId={session.user.id} />
    </div>
  );
}
