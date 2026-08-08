"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

const COOKIE_NAME = "adminReadMode";

/** Da li je ulogovani admin trenutno u Read Mode-u (samo UI prikaz, ne utice na stvarne dozvole). */
export async function getReadMode(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === "1";
}

/** Prebacuje Admin Mode / Read Mode za trenutno ulogovanog admina. */
export async function toggleAdminMode() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Samo admin može da menja ovaj režim.");

  const store = await cookies();
  const isReadMode = store.get(COOKIE_NAME)?.value === "1";

  if (isReadMode) {
    store.delete(COOKIE_NAME);
  } else {
    store.set(COOKIE_NAME, "1", { maxAge: 60 * 60 * 24 * 365, path: "/" });
  }

  revalidatePath("/", "layout");
}
