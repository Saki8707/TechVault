"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canReadSection } from "@/lib/permissions";
import { addBlockNote, updateNoteAction, deleteNoteAction } from "@/lib/notes";

async function requireNoteCapableUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Niste prijavljeni.");
  // Guest ostaje cisto read-only - napomene dodaju Admin i User nalozi.
  if (session.user.role === "GUEST") throw new Error("Gost nalozi ne mogu da ostavljaju napomene.");
  return { id: session.user.id, role: session.user.role };
}

export async function addArticleBlockNote(
  articleId: string,
  sectionId: string,
  blockId: string,
  body: string,
) {
  const actor = await requireNoteCapableUser();

  const canRead = await canReadSection(actor, sectionId);
  if (!canRead) throw new Error("Nemate pristup ovom članku.");

  await addBlockNote({ articleId, blockId, body, actor });
  revalidatePath(`/kategorija/${sectionId}/clanak/${articleId}`);
}

export async function updateArticleNote(articleId: string, sectionId: string, noteId: string, body: string) {
  const actor = await requireNoteCapableUser();

  const canRead = await canReadSection(actor, sectionId);
  if (!canRead) throw new Error("Nemate pristup ovom članku.");

  await updateNoteAction({ noteId, body, actor });
  revalidatePath(`/kategorija/${sectionId}/clanak/${articleId}`);
}

export async function deleteArticleNote(articleId: string, sectionId: string, noteId: string) {
  const actor = await requireNoteCapableUser();

  const canRead = await canReadSection(actor, sectionId);
  if (!canRead) throw new Error("Nemate pristup ovom članku.");

  await deleteNoteAction({ noteId, actor });
  revalidatePath(`/kategorija/${sectionId}/clanak/${articleId}`);
}
