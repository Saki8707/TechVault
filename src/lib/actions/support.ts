"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";
import {
  createTicket as createTicketData,
  addMessage as addMessageData,
  setTicketStatus as setTicketStatusData,
  markTicketRead as markTicketReadData,
  deleteTicket as deleteTicketData,
} from "@/lib/support";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Niste prijavljeni.");
  return session.user;
}

export async function createTicketAction(params: {
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  body: string;
  attachment?: { path: string; filename: string; mimeType: string; size: number } | null;
}) {
  const user = await requireUser();

  const id = await createTicketData({
    ...params,
    actor: { id: user.id, role: user.role },
  });

  revalidatePath("/support");
  redirect(`/support/${id}`);
}

export async function addMessageAction(
  ticketId: string,
  body: string,
  attachment?: { path: string; filename: string; mimeType: string; size: number } | null,
) {
  const user = await requireUser();
  await addMessageData({ ticketId, body, attachment, actor: { id: user.id, role: user.role } });
  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/admin/support");
}

export async function setTicketStatusAction(ticketId: string, status: TicketStatus) {
  const user = await requireUser();
  await setTicketStatusData(ticketId, status, { id: user.id, role: user.role });
  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/admin/support");
}

export async function markTicketReadAction(ticketId: string) {
  const user = await requireUser();
  await markTicketReadData(ticketId, { id: user.id, role: user.role });
  revalidatePath("/admin/support");
}

export async function deleteTicketAction(ticketId: string) {
  const user = await requireUser();
  await deleteTicketData(ticketId, { id: user.id, role: user.role });
  revalidatePath("/support");
  revalidatePath("/admin/support");
  redirect("/support");
}
