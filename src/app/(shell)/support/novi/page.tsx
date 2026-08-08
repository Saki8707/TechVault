import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { NewTicketForm } from "@/components/support/new-ticket-form";

export default async function NewTicketPage() {
  const session = await auth();
  if (!session?.user) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Novi Support zahtev</h1>
      <NewTicketForm />
    </div>
  );
}
