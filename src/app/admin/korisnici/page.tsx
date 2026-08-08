import { prisma } from "@/lib/prisma";
import { getSectionTree, flattenSectionTree } from "@/lib/sections";
import { UserManager } from "@/components/admin/user-manager";

export default async function AdminKorisniciPage() {
  const [users, tree] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      include: {
        permissions: {
          select: { sectionId: true, canRead: true, canWrite: true, section: { select: { name: true } } },
        },
      },
    }),
    getSectionTree(true),
  ]);

  const sections = flattenSectionTree(tree);

  const userList = users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    avatar: u.avatar,
    bio: u.bio,
    grants: u.permissions.map((p) => ({
      sectionId: p.sectionId,
      sectionName: p.section.name,
      canRead: p.canRead,
      canWrite: p.canWrite,
    })),
  }));

  return <UserManager users={userList} sections={sections} />;
}
