import { Header } from "@/components/layout/header";
import { SectionTree } from "@/components/layout/section-tree";
import { LiveRefresh } from "@/components/layout/live-refresh";
import { getSectionTree, filterTreeByIds } from "@/lib/sections";
import { getAccessibleSections } from "@/lib/permissions";
import { auth } from "@/auth";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  const [fullTree, { visible }] = await Promise.all([
    getSectionTree(isAdmin),
    getAccessibleSections(user ? { id: user.id, role: user.role } : null),
  ]);
  const tree = filterTreeByIds(fullTree, visible);

  return (
    <div className="flex min-h-screen flex-col">
      <LiveRefresh />
      <Header />
      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r bg-sidebar p-3 md:block">
          <SectionTree tree={tree} />
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
