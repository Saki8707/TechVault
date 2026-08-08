import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/logo.png";
import { Shield } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SearchBox } from "@/components/layout/search-box";
import { SearchFilters } from "@/components/layout/search-filters";
import { getSectionTree, flattenSectionTree, filterTreeByIds } from "@/lib/sections";
import { getAccessibleSections } from "@/lib/permissions";

export async function Header() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  const [fullTree, { visible }] = await Promise.all([
    getSectionTree(isAdmin),
    getAccessibleSections(user ? { id: user.id, role: user.role } : null),
  ]);
  const tree = filterTreeByIds(fullTree, visible);
  const flatSections = flattenSectionTree(tree);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur sm:grid sm:grid-cols-[1fr_minmax(0,42rem)_1fr] sm:gap-4 sm:px-4 supports-[backdrop-filter]:bg-background/60">
      <div className="flex shrink-0 items-center gap-2 sm:justify-self-start sm:gap-3">
        <MobileNav tree={tree} />
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src={logo} alt="TechVault" priority className="h-7 w-auto sm:h-9" />
          <span className="hidden text-lg font-semibold tracking-tight sm:inline">
            Tech<span className="text-sky-400">Vault</span>
          </span>
        </Link>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 sm:w-full">
        <SearchBox />
        <SearchFilters sections={flatSections} />
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:justify-self-end sm:gap-2">
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            className="hidden sm:inline-flex"
            render={<Link href="/admin/kategorije" />}
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Admin</span>
          </Button>
        )}

        <ThemeToggle />
        <UserMenu name={user?.name} username={user?.username} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
