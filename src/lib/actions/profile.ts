"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_BIO_LENGTH = 500;

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Niste prijavljeni.");
  return session.user;
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const user = await requireUser();

  if (newPassword.length < 6) throw new Error("Nova lozinka mora imati bar 6 karaktera.");

  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  const valid = await bcrypt.compare(oldPassword, dbUser.passwordHash);
  if (!valid) throw new Error("Trenutna lozinka nije tačna.");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
}

export async function updateAvatar(url: string) {
  const user = await requireUser();
  if (!url.trim()) throw new Error("Nedostaje URL slike.");

  await prisma.user.update({ where: { id: user.id }, data: { avatar: url } });
  revalidatePath("/", "layout");
}

export async function removeAvatar() {
  const user = await requireUser();

  await prisma.user.update({ where: { id: user.id }, data: { avatar: null } });
  revalidatePath("/", "layout");
}

export async function updateBio(bio: string) {
  const user = await requireUser();
  const trimmed = bio.trim();
  if (trimmed.length > MAX_BIO_LENGTH) {
    throw new Error(`Opis ne sme biti duži od ${MAX_BIO_LENGTH} karaktera.`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { bio: trimmed.length > 0 ? trimmed : null },
  });
  revalidatePath("/", "layout");
}
