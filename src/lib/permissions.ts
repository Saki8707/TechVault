import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { getSectionTree, flattenSectionTree } from "@/lib/sections";

export type AuthUser = { id: string; role: Role } | null | undefined;

/** Vraca id-jeve sekcije i svih njenih predaka, od sebe ka korenu. */
export async function getSectionAncestorIds(sectionId: string): Promise<string[]> {
  const ids: string[] = [];
  let currentId: string | null = sectionId;

  while (currentId) {
    ids.push(currentId);
    const section: { parentId: string | null } | null = await prisma.section.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = section?.parentId ?? null;
  }

  return ids;
}

/**
 * Write pristup dodeljen na bilo kom nivou (kategorija/podkategorija/segment)
 * automatski vazi za sve ispod njega u stablu. Guest nikad nema write.
 */
export async function canWriteSection(user: AuthUser, sectionId: string): Promise<boolean> {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "GUEST") return false;

  const ancestorIds = await getSectionAncestorIds(sectionId);

  const grant = await prisma.sectionPermission.findFirst({
    where: {
      userId: user.id,
      sectionId: { in: ancestorIds },
      canWrite: true,
    },
    select: { id: true },
  });

  return grant !== null;
}

/**
 * Read pristup: Admin uvek, User samo uz eksplicitnu dozvolu (nasledjenu kroz
 * stablo), Guest samo za sadrzaj koji je admin oznacio kao guestVisible
 * (takodje nasledjeno kroz stablo).
 */
export async function canReadSection(user: AuthUser, sectionId: string): Promise<boolean> {
  if (!user) return false;
  if (user.role === "ADMIN") return true;

  const ancestorIds = await getSectionAncestorIds(sectionId);

  if (user.role === "GUEST") {
    const visible = await prisma.section.findFirst({
      where: { id: { in: ancestorIds }, guestVisible: true },
      select: { id: true },
    });
    return visible !== null;
  }

  const grant = await prisma.sectionPermission.findFirst({
    where: { userId: user.id, sectionId: { in: ancestorIds }, canRead: true },
    select: { id: true },
  });
  return grant !== null;
}

/** Svi potomci (uklj. sebe) date sekcije, na osnovu vec ucitane mape roditelj->deca. */
function collectDescendants(id: string, childrenMap: Map<string, string[]>, into: Set<string>) {
  into.add(id);
  for (const child of childrenMap.get(id) ?? []) collectDescendants(child, childrenMap, into);
}

export type AccessibleSections = {
  /** Sekcije cije clanke korisnik sme da cita. "all" = admin, bez ogranicenja. */
  readable: Set<string> | "all";
  /** readable + preci svakog readable cvora - za prikaz stabla/navigaciju (folderi kroz koje se prolazi). */
  visible: Set<string> | "all";
};

/**
 * Racuna koje sekcije korisnik sme da cita (za User: eksplicitni grant + podstablo;
 * za Guest: guestVisible + podstablo), iskljucujuci sakrivene (hidden) sekcije.
 * Koristi se za filtriranje stabla kategorija, liste clanaka i pretrage.
 */
export async function getAccessibleSections(user: AuthUser): Promise<AccessibleSections> {
  if (!user) return { readable: new Set(), visible: new Set() };
  if (user.role === "ADMIN") return { readable: "all", visible: "all" };

  const [allSections, tree] = await Promise.all([
    prisma.section.findMany({ select: { id: true, parentId: true } }),
    getSectionTree(false), // vec izbacuje hidden + njihova podstabla
  ]);

  const nonHiddenIds = new Set(flattenSectionTree(tree).map((s) => s.id));

  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string | null>();
  for (const s of allSections) {
    parentMap.set(s.id, s.parentId);
    if (s.parentId) {
      childrenMap.set(s.parentId, [...(childrenMap.get(s.parentId) ?? []), s.id]);
    }
  }

  let grantRootIds: string[];
  if (user.role === "GUEST") {
    const guestSections = await prisma.section.findMany({
      where: { guestVisible: true },
      select: { id: true },
    });
    grantRootIds = guestSections.map((s) => s.id);
  } else {
    const grants = await prisma.sectionPermission.findMany({
      where: { userId: user.id, canRead: true },
      select: { sectionId: true },
    });
    grantRootIds = grants.map((g) => g.sectionId);
  }

  const readable = new Set<string>();
  for (const rootId of grantRootIds) collectDescendants(rootId, childrenMap, readable);
  for (const id of [...readable]) {
    if (!nonHiddenIds.has(id)) readable.delete(id);
  }

  const visible = new Set(readable);
  for (const id of readable) {
    let cur = parentMap.get(id) ?? null;
    while (cur) {
      visible.add(cur);
      cur = parentMap.get(cur) ?? null;
    }
  }

  return { readable, visible };
}
