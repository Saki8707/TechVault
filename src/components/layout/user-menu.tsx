"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { LogOut, Moon, Shield, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  name,
  username,
  isAdmin,
}: {
  name?: string | null;
  username?: string | null;
  isAdmin?: boolean;
}) {
  const initials = (name ?? username ?? "??").slice(0, 2).toUpperCase();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="rounded-full" />}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gradient-to-br from-brand-from to-brand-to text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium leading-tight">{name}</span>
              <span className="text-xs font-normal text-muted-foreground">@{username}</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        {isAdmin && (
          <DropdownMenuItem className="sm:hidden" render={<Link href="/admin/kategorije" />}>
            <Shield className="h-4 w-4" />
            Admin panel
          </DropdownMenuItem>
        )}
        {mounted && (
          <DropdownMenuItem
            className="sm:hidden"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? "Uključi svetlu temu" : "Uključi tamnu temu"}
          </DropdownMenuItem>
        )}
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
