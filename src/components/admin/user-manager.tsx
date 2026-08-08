"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Shield, UserRound, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { FlatSection } from "@/lib/sections";
import { createUser, updateUser, deleteUser, type SectionGrant } from "@/app/admin/korisnici/actions";

type Role = "ADMIN" | "USER" | "GUEST";

const ROLE_OPTIONS: { value: Role; label: string; hint: string }[] = [
  { value: "ADMIN", label: "Admin", hint: "Pun pristup svemu + upravljanje sajtom" },
  { value: "USER", label: "User", hint: "Čita/piše samo kategorije koje mu dodeliš" },
  { value: "GUEST", label: "Guest", hint: "Samo čitanje sadržaja koji je admin označio kao javan" },
];

type UserGrant = { sectionId: string; sectionName: string; canRead: boolean; canWrite: boolean };

type UserRow = {
  id: string;
  username: string;
  name: string;
  role: Role;
  grants: UserGrant[];
};

type EditState = {
  mode: "create" | "edit";
  id?: string;
  username: string;
  name: string;
  password: string;
  role: Role;
  grants: Map<string, SectionGrant>;
} | null;

function grantsToMap(grants: UserGrant[]): Map<string, SectionGrant> {
  return new Map(
    grants.map((g) => [g.sectionId, { sectionId: g.sectionId, canRead: g.canRead, canWrite: g.canWrite }]),
  );
}

export function UserManager({
  users,
  sections,
}: {
  users: UserRow[];
  sections: FlatSection[];
}) {
  const [edit, setEdit] = useState<EditState>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [isPending, setIsPending] = useState(false);

  function openCreate() {
    setEdit({
      mode: "create",
      username: "",
      name: "",
      password: "",
      role: "USER",
      grants: new Map(),
    });
  }

  function openEdit(user: UserRow) {
    setEdit({
      mode: "edit",
      id: user.id,
      username: user.username,
      name: user.name,
      password: "",
      role: user.role,
      grants: grantsToMap(user.grants),
    });
  }

  function setGrant(sectionId: string, patch: Partial<SectionGrant>) {
    if (!edit) return;
    const current = edit.grants.get(sectionId) ?? { sectionId, canRead: false, canWrite: false };
    const next = new Map(edit.grants);
    next.set(sectionId, { ...current, ...patch });
    setEdit({ ...edit, grants: next });
  }

  async function submitEdit() {
    if (!edit) return;
    setIsPending(true);
    const grantList = [...edit.grants.values()];
    try {
      if (edit.mode === "create") {
        await createUser(edit.username, edit.name, edit.password, edit.role, grantList);
        toast.success("Korisnik je kreiran.");
      } else {
        await updateUser(edit.id!, edit.name, edit.role, edit.password, grantList);
        toast.success("Korisnik je izmenjen.");
      }
      setIsPending(false);
      setEdit(null);
    } catch (err) {
      setIsPending(false);
      toast.error(err instanceof Error ? err.message : "Greška.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsPending(true);
    try {
      await deleteUser(deleteTarget.id);
      toast.success("Korisnik je obrisan.");
      setIsPending(false);
      setDeleteTarget(null);
    } catch (err) {
      setIsPending(false);
      toast.error(err instanceof Error ? err.message : "Greška.");
    }
  }

  function roleBadge(role: Role) {
    if (role === "ADMIN") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      );
    }
    if (role === "GUEST") {
      return (
        <Badge variant="outline" className="gap-1">
          <Eye className="h-3 w-3" />
          Guest
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Users className="h-3 w-3" />
        User
      </Badge>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Korisnici</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novi korisnik
        </Button>
      </div>

      <div className="divide-y rounded-lg border">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{user.name}</span>
                <span className="text-xs text-muted-foreground">@{user.username}</span>
                {roleBadge(user.role)}
              </div>
              {user.role === "USER" && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {user.grants.length > 0
                    ? user.grants
                        .map(
                          (g) =>
                            `${g.sectionName} (${[g.canRead && "R", g.canWrite && "W"]
                              .filter(Boolean)
                              .join("/")})`,
                        )
                        .join(", ")
                    : "Bez dodeljenih kategorija (ništa ne vidi)"}
                </p>
              )}
              {user.role === "GUEST" && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Vidi samo kategorije označene kao &quot;guest&quot; u admin/kategorije
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon-sm" aria-label="Izmeni" onClick={() => openEdit(user)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Obriši"
                onClick={() => setDeleteTarget(user)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={edit !== null} onOpenChange={(open) => !open && setEdit(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              {edit?.mode === "create" ? "Novi korisnik" : "Izmeni korisnika"}
            </DialogTitle>
          </DialogHeader>

          {edit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="u-name">Ime</Label>
                  <Input
                    id="u-name"
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-username">Korisničko ime</Label>
                  <Input
                    id="u-username"
                    value={edit.username}
                    disabled={edit.mode === "edit"}
                    onChange={(e) => setEdit({ ...edit, username: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="u-password">
                  {edit.mode === "create" ? "Lozinka" : "Nova lozinka (ostavi prazno da ne menjaš)"}
                </Label>
                <Input
                  id="u-password"
                  type="text"
                  value={edit.password}
                  onChange={(e) => setEdit({ ...edit, password: e.target.value })}
                  placeholder={edit.mode === "create" ? "min. 6 karaktera" : "••••••"}
                />
              </div>

              <div className="space-y-2">
                <Label>Nalog je za</Label>
                <Select value={edit.role} onValueChange={(v) => setEdit({ ...edit, role: v as Role })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {ROLE_OPTIONS.find((o) => o.value === edit.role)?.hint}
                </p>
              </div>

              {edit.role === "USER" && (
                <div className="space-y-2">
                  <Label>Pristup po kategoriji (R = čitanje, W = pisanje)</Label>
                  <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-md border p-2">
                    {sections.map((s) => {
                      const grant = edit.grants.get(s.id) ?? { canRead: false, canWrite: false };
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                          style={{ paddingLeft: `${8 + s.depth * 16}px` }}
                        >
                          <span className="truncate">
                            {s.name}
                            {s.hidden && (
                              <span className="ml-1.5 text-xs text-muted-foreground">(skriveno)</span>
                            )}
                          </span>
                          <div className="flex shrink-0 items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              R
                              <Switch
                                checked={grant.canRead}
                                onCheckedChange={(checked) => setGrant(s.id, { canRead: checked })}
                              />
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              W
                              <Switch
                                checked={grant.canWrite}
                                onCheckedChange={(checked) =>
                                  setGrant(s.id, { canWrite: checked, canRead: checked ? true : grant.canRead })
                                }
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)} disabled={isPending}>
              Otkaži
            </Button>
            <Button onClick={submitEdit} disabled={isPending}>
              Sačuvaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obriši korisnika &quot;{deleteTarget?.name}&quot;?</DialogTitle>
            <DialogDescription>Ova akcija se ne može poništiti.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>
              Otkaži
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
              Obriši
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
