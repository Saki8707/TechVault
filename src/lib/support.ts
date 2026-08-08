import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import type { Role, TicketStatus, TicketCategory, TicketPriority } from "@prisma/client";

const SUPPORT_STORAGE_DIR = path.join(process.cwd(), "storage", "support");

type Actor = { id: string; role: Role };

export type TicketMessageDto = {
  id: string;
  body: string;
  createdAt: Date;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  attachmentPath: string | null;
  attachmentFilename: string | null;
  attachmentMimeType: string | null;
  attachmentSize: number | null;
};

export type TicketDto = {
  id: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: Date;
  lastActivityAt: Date;
  userId: string;
  userName: string;
  messages: TicketMessageDto[];
};

export type TicketSummaryDto = {
  id: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: Date;
  lastActivityAt: Date;
  userId: string;
  userName: string;
  adminUnread: boolean;
};

const messageInclude = {
  sender: { select: { name: true, avatar: true } },
} as const;

function toMessageDto(m: {
  id: string;
  body: string;
  createdAt: Date;
  senderId: string;
  sender: { name: string; avatar: string | null };
  attachmentPath: string | null;
  attachmentFilename: string | null;
  attachmentMimeType: string | null;
  attachmentSize: number | null;
}): TicketMessageDto {
  return {
    id: m.id,
    body: m.body,
    createdAt: m.createdAt,
    senderId: m.senderId,
    senderName: m.sender.name,
    senderAvatar: m.sender.avatar,
    attachmentPath: m.attachmentPath,
    attachmentFilename: m.attachmentFilename,
    attachmentMimeType: m.attachmentMimeType,
    attachmentSize: m.attachmentSize,
  };
}

export async function getMyTickets(userId: string): Promise<TicketSummaryDto[]> {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { lastActivityAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  return tickets.map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    priority: t.priority,
    status: t.status,
    createdAt: t.createdAt,
    lastActivityAt: t.lastActivityAt,
    userId: t.userId,
    userName: t.user.name,
    adminUnread: t.adminUnread,
  }));
}

export async function getTicket(id: string, viewer: Actor): Promise<TicketDto> {
  const ticket = await prisma.supportTicket.findUniqueOrThrow({
    where: { id },
    include: {
      user: { select: { name: true } },
      messages: { orderBy: { createdAt: "asc" }, include: messageInclude },
    },
  });

  if (viewer.role !== "ADMIN" && ticket.userId !== viewer.id) {
    throw new Error("Nemate pristup ovom zahtevu.");
  }

  return {
    id: ticket.id,
    title: ticket.title,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    createdAt: ticket.createdAt,
    lastActivityAt: ticket.lastActivityAt,
    userId: ticket.userId,
    userName: ticket.user.name,
    messages: ticket.messages.map(toMessageDto),
  };
}

export async function createTicket(params: {
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  body: string;
  attachment?: { path: string; filename: string; mimeType: string; size: number } | null;
  actor: Actor;
}): Promise<string> {
  const title = params.title.trim();
  const body = params.body.trim();
  if (!title) throw new Error("Naslov je obavezan.");
  if (!body) throw new Error("Opis problema je obavezan.");

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.supportTicket.create({
      data: {
        userId: params.actor.id,
        title,
        category: params.category,
        priority: params.priority,
      },
    });
    await tx.supportMessage.create({
      data: {
        ticketId: created.id,
        senderId: params.actor.id,
        body,
        attachmentPath: params.attachment?.path,
        attachmentFilename: params.attachment?.filename,
        attachmentMimeType: params.attachment?.mimeType,
        attachmentSize: params.attachment?.size,
      },
    });
    return created;
  });

  return ticket.id;
}

export async function addMessage(params: {
  ticketId: string;
  body: string;
  attachment?: { path: string; filename: string; mimeType: string; size: number } | null;
  actor: Actor;
}) {
  const body = params.body.trim();
  if (!body) throw new Error("Poruka ne može biti prazna.");

  const ticket = await prisma.supportTicket.findUniqueOrThrow({
    where: { id: params.ticketId },
    select: { userId: true },
  });
  if (params.actor.role !== "ADMIN" && ticket.userId !== params.actor.id) {
    throw new Error("Nemate pristup ovom zahtevu.");
  }

  await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        ticketId: params.ticketId,
        senderId: params.actor.id,
        body,
        attachmentPath: params.attachment?.path,
        attachmentFilename: params.attachment?.filename,
        attachmentMimeType: params.attachment?.mimeType,
        attachmentSize: params.attachment?.size,
      },
    }),
    prisma.supportTicket.update({
      where: { id: params.ticketId },
      data: {
        lastActivityAt: new Date(),
        // Ako korisnik pise - admin ima novu neprocitanu poruku. Ako admin pise - njegov
        // odgovor automatski markira zahtev kao procitan (radio je na njemu upravo sada).
        adminUnread: params.actor.role !== "ADMIN",
      },
    }),
  ]);
}

export async function deleteTicket(id: string, actor: Actor) {
  const ticket = await prisma.supportTicket.findUniqueOrThrow({
    where: { id },
    select: {
      userId: true,
      messages: { select: { attachmentPath: true } },
    },
  });

  if (actor.role !== "ADMIN" && ticket.userId !== actor.id) {
    throw new Error("Nemate pristup ovom zahtevu.");
  }

  await prisma.supportTicket.delete({ where: { id } });

  await Promise.all(
    ticket.messages
      .filter((m): m is { attachmentPath: string } => Boolean(m.attachmentPath))
      .map((m) =>
        unlink(path.join(SUPPORT_STORAGE_DIR, m.attachmentPath)).catch(() => {
          // fajl vec ne postoji na disku - nastavi bez greske
        }),
      ),
  );
}

// ---- Admin deo (Faza M) ----

export type TicketFilters = {
  status?: TicketStatus;
  userId?: string;
  category?: TicketCategory;
  from?: Date;
  to?: Date;
  search?: string;
};

export async function getAllTickets(filters: TicketFilters): Promise<TicketSummaryDto[]> {
  const tickets = await prisma.supportTicket.findMany({
    where: {
      status: filters.status,
      userId: filters.userId,
      category: filters.category,
      createdAt:
        filters.from || filters.to
          ? { gte: filters.from, lte: filters.to }
          : undefined,
      title: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
    },
    orderBy: { lastActivityAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  return tickets.map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    priority: t.priority,
    status: t.status,
    createdAt: t.createdAt,
    lastActivityAt: t.lastActivityAt,
    userId: t.userId,
    userName: t.user.name,
    adminUnread: t.adminUnread,
  }));
}

export async function setTicketStatus(id: string, status: TicketStatus, actor: Actor) {
  if (actor.role !== "ADMIN") throw new Error("Samo admin može da menja status zahteva.");
  await prisma.supportTicket.update({ where: { id }, data: { status, adminUnread: false } });
}

export async function markTicketRead(id: string, actor: Actor) {
  if (actor.role !== "ADMIN") return;
  await prisma.supportTicket.update({ where: { id }, data: { adminUnread: false } });
}

export async function getUnreadTicketCount(): Promise<number> {
  return prisma.supportTicket.count({ where: { adminUnread: true } });
}
