import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TOP_LEVEL_SECTIONS = [
  { slug: "wifi", name: "WiFi" },
  { slug: "iptv", name: "IPTV" },
  { slug: "glight", name: "GLight" },
  { slug: "wifi6e", name: "WiFi6E" },
  { slug: "gpon", name: "GPON" },
  { slug: "voip", name: "VoIP" },
];

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME ?? "Admin";
  const adminEmail = process.env.ADMIN_EMAIL || undefined;

  if (!adminUsername || !adminPassword) {
    throw new Error("ADMIN_USERNAME i ADMIN_PASSWORD moraju biti postavljeni u .env");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { username: adminUsername },
    update: { passwordHash, name: adminName, email: adminEmail, role: "ADMIN" },
    create: {
      username: adminUsername,
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: "ADMIN",
    },
  });

  for (let i = 0; i < TOP_LEVEL_SECTIONS.length; i++) {
    const section = TOP_LEVEL_SECTIONS[i];
    // Prisma ne dozvoljava null u compound-unique `where` (parentId_slug), pa se
    // postojanje top-level sekcije proverava preko findFirst umesto upsert.
    const existing = await prisma.section.findFirst({
      where: { parentId: null, slug: section.slug },
    });
    if (!existing) {
      await prisma.section.create({
        data: {
          slug: section.slug,
          name: section.name,
          order: i,
          parentId: null,
        },
      });
    }
  }

  console.log("Seed zavrsen: admin nalog i 6 top-level kategorija su spremni.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
