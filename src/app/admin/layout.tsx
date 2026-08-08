import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { LiveRefresh } from "@/components/layout/live-refresh";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-5xl 2xl:max-w-6xl space-y-6">
      <LiveRefresh />
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <nav className="flex gap-4 text-sm">
          <Link href="/admin/kategorije" className="text-muted-foreground hover:text-foreground">
            Kategorije
          </Link>
          <Link href="/admin/korisnici" className="text-muted-foreground hover:text-foreground">
            Korisnici
          </Link>
          <Link href="/admin/tagovi" className="text-muted-foreground hover:text-foreground">
            Tagovi
          </Link>
          <Link href="/admin/log" className="text-muted-foreground hover:text-foreground">
            Log
          </Link>
        </nav>
        <Button variant="ghost" size="sm" render={<Link href="/" />}>
          <ArrowLeft className="h-4 w-4" />
          Nazad na sajt
        </Button>
      </div>
      {children}
    </div>
  );
}
