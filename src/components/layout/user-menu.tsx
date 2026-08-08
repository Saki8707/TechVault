"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { LogOut, Moon, Shield, ShieldCheck, Sun, User, LifeBuoy, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleAdminMode } from "@/lib/admin-mode";

export function UserMenu({
  name,
  username,
  isAdmin,
  avatar,
  readMode,
}: {
  name?: string | null;
  username?: string | null;
  isAdmin?: boolean;
  avatar?: string | null;
  readMode?: boolean;
}) {
  const initials = (name ?? username ?? "??").slice(0, 2).toUpperCase();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === "dark";

  function handleToggleAdminMode() {
    startTransition(async () => {
      await toggleAdminMode();
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="rounded-full" />}
      >
        <Avatar className="h-8 w-8">
          {avatar && <AvatarImage src={avatar} alt={name ?? ""} />}
          <AvatarFallback className="bg-gradient-to-br from-brand-from to-brand-to text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium leading-tight">{name}</span>
              <span className="text-xs font-normal text-muted-foreground">@{username}</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href="/profil" />}>
          <User className="h-4 w-4" />
          Moj profil
        </DropdownMenuItem>

        {isAdmin && (
          <DropdownMenuItem onClick={handleToggleAdminMode} disabled={isPending}>
            {readMode ? <ShieldCheck className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {readMode ? "Uključi Admin Mode" : "Uključi Read Mode"}
          </DropdownMenuItem>
        )}

        {isAdmin && (
          <DropdownMenuItem render={<Link href="/admin/kategorije" />}>
            <Shield className="h-4 w-4" />
            Admin panel
          </DropdownMenuItem>
        )}

        {mounted && (
          <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? "Uključi svetlu temu" : "Uključi tamnu temu"}
          </DropdownMenuItem>
        )}

        <DropdownMenuItem render={<Link href="/support" />}>
          <LifeBuoy className="h-4 w-4" />
          Support
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            // signOut({ callbackUrl }) gradi apsolutni redirect URL server-side, sto na
            // ovom self-hostovanom serveru (next start -H 0.0.0.0) ume da razresi na
            // 0.0.0.0 umesto na stvarni host (ERR_ADDRESS_INVALID). redirect:false
            // preskace tu server-side konstrukciju - navigacija ide relativnim putem,
            // pa je uvek na hostu na kom korisnik stvarno jeste.
            signOut({ redirect: false }).finally(() => {
              window.location.href = "/login";
            });
          }}
        >
          <LogOut className="h-4 w-4" />
          Odjavi se
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
