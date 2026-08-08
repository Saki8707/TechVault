"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export type SectionGrant = { sectionId: string; canRead: boolean; canWrite: boolean };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Samo admin može da upravlja korisnicima.");
  }
  return session.user;
}

async function setUserSectionPermissions(userId: string, grants: SectionGrant[]) {
  await prisma.sectionPermission.deleteMany({ where: { userId } });
  const active = grants.filter((g) => g.canRead || g.canWrite);
  if (active.length > 0) {
    await prisma.sectionPermission.createMany({
      data: active.map((g) => ({
        userId,
        sectionId: g.sectionId,
        canRead: g.canRead,
        canWrite: g.canWrite,
      })),
    });
  }
}

export async function createUser(
  username: string,
  name: string,
  password: string,
  role: Role,
  grants: SectionGrant[],
) {
  await requireAdmin();

  const trimmedUsername = username.trim();
  const trimmedName = name.trim();
  if (!trimmedUsername || !trimmedName) throw new Error("Korisničko ime i ime su obavezni.");
  if (password.length < 6) throw new Error("Lozinka mora imati bar 6 karaktera.");

  const existing = await prisma.user.findUnique({ where: { username: trimmedUsername } });
  if (existing) throw new Error("Korisničko ime je već zauzeto.");

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { username: trimmedUsername, name: trimmedName, passwordHash, role },
  });

  if (role === "USER") {
    await setUserSectionPermissions(user.id, grants);
  }

  revalidatePath("/admin/korisnici");
}

export async function updateUser(
  userId: string,
  name: string,
  role: Role,
  newPassword: string,
  grants: SectionGrant[],
) {
  const admin = await requireAdmin();

  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Ime je obavezno.");

  if (userId === admin.id && role !== "ADMIN") {
    throw new Error("Ne možeš sebi oduzeti admin ovlašćenja.");
  }

  const data: { name: string; role: Role; passwordHash?: string } = {
    name: trimmedName,
    role,
  };

  if (newPassword) {
    if (newPassword.length < 6) throw new Error("Lozinka mora imati bar 6 karaktera.");
    data.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  await prisma.user.update({ where: { id: userId }, data });
  await setUserSectionPermissions(userId, role === "USER" ? grants : []);

  revalidatePath("/admin/korisnici");
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    throw new Error("Ne možeš obrisati sopstveni nalog.");
  }

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin/korisnici");
}
