import { prisma } from "@/lib/prisma";
import type { NoteVisibility, Role, NoteAction, Prisma } from "@prisma/client";

export { blockIdFor } from "@/lib/block-id";

type Actor = { id: string; role: Role };
type Tx = Prisma.TransactionClient;

export type ArticleNoteDto = {
  id: string;
  anchorId: string;
  blockId: string | null;
  body: string;
  visibility: NoteVisibility;
  createdByName: string;
  canManage: boolean;
};

/** Napomene za clanak, filtrirane prema ulozi gledaoca (Admin vidi sve, ostali samo ALL_USERS). */
export async function getNotesForArticle(
  articleId: string,
  viewer: Actor | undefined,
): Promise<ArticleNoteDto[]> {
  const notes = await prisma.articleNote.findMany({
    where: {
      articleId,
      ...(viewer?.role === "ADMIN" ? {} : { visibility: "ALL_USERS" as NoteVisibility }),
    },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return notes.map((n) => ({
    id: n.id,
    anchorId: n.anchorId,
    blockId: n.blockId,
    body: n.body,
    visibility: n.visibility,
    createdByName: n.createdBy.name,
    canManage: viewer ? viewer.role === "ADMIN" || n.createdById === viewer.id : false,
  }));
}

/** Izvlaci sve data-note-id vrednosti prisutne u sanitizovanom HTML-u clanka. */
export function extractNoteAnchorIds(html: string): string[] {
  const ids = new Set<string>();
  const re = /data-note-id="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    ids.add(match[1]);
  }
  return [...ids];
}

async function logNoteAction(
  tx: Tx,
  params: {
    articleId: string;
    anchorId: string;
    action: NoteAction;
    body: string;
    visibility: NoteVisibility;
    actorId: string;
  },
) {
  await tx.noteAuditLog.create({ data: params });
}

export type PendingNote = { anchorId: string; body: string; visibility: NoteVisibility };

/**
 * Uskladjuje ArticleNote redove sa trenutnim sadrzajem clanka (poziva se pri cuvanju
 * clanka kroz puni editor - admin ili write korisnik). Kreira/azurira napomene cije se
 * sidro i dalje nalazi u HTML-u, brise one cije sidro vise ne postoji. Svaka promena se
 * loguje. Non-admin autor ne moze da postavi ADMIN_ONLY vidljivost niti da menja tudju
 * napomenu - takvi pokusaji se tiho ignorisu.
 */
export async function syncArticleNotes(
  articleId: string,
  cleanHtml: string,
  pendingNotes: PendingNote[],
  actor: Actor,
) {
  const anchorsInContent = new Set(extractNoteAnchorIds(cleanHtml));

  await prisma.$transaction(async (tx) => {
    const existing = await tx.articleNote.findMany({ where: { articleId } });
    const existingByAnchor = new Map(existing.map((n) => [n.anchorId, n]));

    // Obrisi napomene cije sidro vise nije u sadrzaju (samo ako smes da upravljas njima)
    for (const note of existing) {
      if (anchorsInContent.has(note.anchorId)) continue;
      if (actor.role !== "ADMIN" && note.createdById !== actor.id) continue;
      await tx.articleNote.delete({ where: { id: note.id } });
      await logNoteAction(tx, {
        articleId,
        anchorId: note.anchorId,
        action: "DELETED",
        body: note.body,
        visibility: note.visibility,
        actorId: actor.id,
      });
    }

    for (const pending of pendingNotes) {
      if (!anchorsInContent.has(pending.anchorId)) continue;
      const visibility: NoteVisibility = actor.role === "ADMIN" ? pending.visibility : "ALL_USERS";
      const existingNote = existingByAnchor.get(pending.anchorId);

      if (!existingNote) {
        await tx.articleNote.create({
          data: {
            articleId,
            anchorId: pending.anchorId,
            body: pending.body,
            visibility,
            createdById: actor.id,
          },
        });
        await logNoteAction(tx, {
          articleId,
          anchorId: pending.anchorId,
          action: "CREATED",
          body: pending.body,
          visibility,
          actorId: actor.id,
        });
        continue;
      }

      const canManage = actor.role === "ADMIN" || existingNote.createdById === actor.id;
      if (!canManage) continue;
      if (existingNote.body === pending.body && existingNote.visibility === visibility) continue;

      await tx.articleNote.update({
        where: { id: existingNote.id },
        data: { body: pending.body, visibility },
      });
      await logNoteAction(tx, {
        articleId,
        anchorId: pending.anchorId,
        action: "UPDATED",
        body: pending.body,
        visibility,
        actorId: actor.id,
      });
    }
  });
}

/** Napomena dodata direktno iz prikaza clanka (bez write pristupa), vezana za pasus (blockId). */
export async function addBlockNote(params: {
  articleId: string;
  blockId: string;
  body: string;
  actor: Actor;
}) {
  const { articleId, blockId, body, actor } = params;
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Napomena ne može biti prazna.");

  const anchorId = crypto.randomUUID();
  const visibility: NoteVisibility = "ALL_USERS";

  await prisma.$transaction(async (tx) => {
    await tx.articleNote.create({
      data: { articleId, anchorId, blockId, body: trimmed, visibility, createdById: actor.id },
    });
    await logNoteAction(tx, { articleId, anchorId, action: "CREATED", body: trimmed, visibility, actorId: actor.id });
  });
}

export async function updateNoteAction(params: { noteId: string; body: string; actor: Actor }) {
  const { noteId, body, actor } = params;
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Napomena ne može biti prazna.");

  const note = await prisma.articleNote.findUniqueOrThrow({ where: { id: noteId } });
  const canManage = actor.role === "ADMIN" || note.createdById === actor.id;
  if (!canManage) throw new Error("Nemate dozvolu da izmenite ovu napomenu.");

  await prisma.$transaction(async (tx) => {
    await tx.articleNote.update({ where: { id: noteId }, data: { body: trimmed } });
    await logNoteAction(tx, {
      articleId: note.articleId,
      anchorId: note.anchorId,
      action: "UPDATED",
      body: trimmed,
      visibility: note.visibility,
      actorId: actor.id,
    });
  });

  return note.articleId;
}

export async function deleteNoteAction(params: { noteId: string; actor: Actor }) {
  const { noteId, actor } = params;

  const note = await prisma.articleNote.findUniqueOrThrow({ where: { id: noteId } });
  const canManage = actor.role === "ADMIN" || note.createdById === actor.id;
  if (!canManage) throw new Error("Nemate dozvolu da obrišete ovu napomenu.");

  await prisma.$transaction(async (tx) => {
    await tx.articleNote.delete({ where: { id: noteId } });
    await logNoteAction(tx, {
      articleId: note.articleId,
      anchorId: note.anchorId,
      action: "DELETED",
      body: note.body,
      visibility: note.visibility,
      actorId: actor.id,
    });
  });

  return note.articleId;
}

export type NoteLogEntryDto = {
  id: string;
  action: NoteAction;
  body: string;
  visibility: NoteVisibility;
  createdAt: Date;
  actorName: string;
  articleId: string;
  articleTitle: string;
  sectionId: string;
};

/** Admin-only: poslednje izmene napomena na celom sajtu (ko je sta napisao/izmenio/obrisao). */
export async function getRecentNoteAuditLog(limit = 200): Promise<NoteLogEntryDto[]> {
  const rows = await prisma.noteAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: { select: { name: true } },
      article: { select: { id: true, title: true, sectionId: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    body: r.body,
    visibility: r.visibility,
    createdAt: r.createdAt,
    actorName: r.actor.name,
    articleId: r.article.id,
    articleTitle: r.article.title,
    sectionId: r.article.sectionId,
  }));
}
