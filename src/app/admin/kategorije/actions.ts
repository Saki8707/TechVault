"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Samo admin može da upravlja kategorijama.");
  }
}

async function uniqueSlugForParent(parentId: string | null, baseSlug: string) {
  let slug = baseSlug || "kategorija";
  let suffix = 2;

  while (await prisma.section.findFirst({ where: { parentId, slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function createSection(parentId: string | null, name: string) {
  await requireAdmin();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Naziv je obavezan.");

  const slug = await uniqueSlugForParent(parentId, slugify(trimmed));
  const siblingCount = await prisma.section.count({ where: { parentId } });

  await prisma.section.create({
    data: { name: trimmed, slug, parentId, order: siblingCount },
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/kategorije");
}

export async function renameSection(id: string, name: string) {
  await requireAdmin();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Naziv je obavezan.");

  await prisma.section.update({ where: { id }, data: { name: trimmed } });

  revalidatePath("/", "layout");
  revalidatePath("/admin/kategorije");
}

export async function toggleSectionHidden(id: string, hidden: boolean) {
  await requireAdmin();

  await prisma.section.update({ where: { id }, data: { hidden } });

  revalidatePath("/", "layout");
  revalidatePath("/admin/kategorije");
}

export async function toggleSectionGuestVisible(id: string, guestVisible: boolean) {
  await requireAdmin();

  await prisma.section.update({ where: { id }, data: { guestVisible } });

  revalidatePath("/", "layout");
  revalidatePath("/admin/kategorije");
}

export async function setSectionColor(id: string, color: string | null) {
  await requireAdmin();

  const valid = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : null;
  await prisma.section.update({ where: { id }, data: { color: valid } });

  revalidatePath("/", "layout");
  revalidatePath("/admin/kategorije");
}

export async function deleteSection(id: string) {
  await requireAdmin();

  await prisma.section.delete({ where: { id } });

  revalidatePath("/", "layout");
  revalidatePath("/admin/kategorije");
}
