"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Trash2, Save, KeyRound } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Role } from "@prisma/client";
import { updateAvatar, removeAvatar, updateBio, changePassword } from "@/lib/actions/profile";

const MAX_BIO_LENGTH = 500;

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  USER: "Korisnik",
  GUEST: "Gost",
};

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/uploads/image", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Greška pri otpremanju slike.");
  return data.url as string;
}

export function ProfileForm({
  username,
  name,
  role,
  initialAvatar,
  initialBio,
}: {
  username: string;
  name: string;
  role: Role;
  initialAvatar: string | null;
  initialBio: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [bio, setBio] = useState(initialBio ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const initials = name.slice(0, 2).toUpperCase();

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadImage(file);
      await updateAvatar(url);
      setAvatar(url);
      toast.success("Profilna slika je sačuvana.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri otpremanju slike.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    setIsUploading(true);
    try {
      await removeAvatar();
      setAvatar(null);
      toast.success("Profilna slika je uklonjena.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSaveBio() {
    setIsSavingBio(true);
    try {
      await updateBio(bio);
      toast.success("Opis je sačuvan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri čuvanju.");
    } finally {
      setIsSavingBio(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("Nova lozinka i potvrda se ne poklapaju.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Lozinka je promenjena.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri promeni lozinke.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="space-y-6 rounded-lg border p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <Avatar size="lg" className="h-16 w-16">
          {avatar && <AvatarImage src={avatar} alt={name} />}
          <AvatarFallback className="bg-gradient-to-br from-brand-from to-brand-to text-white text-lg">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{name}</span>
            <Badge variant="secondary">{ROLE_LABEL[role]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">@{username}</p>
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              {avatar ? "Promeni sliku" : "Postavi sliku"}
            </Button>
            {avatar && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isUploading}
                onClick={handleRemoveAvatar}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Ukloni
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="bio">O meni</Label>
          <span className="text-xs text-muted-foreground">
            {bio.length}/{MAX_BIO_LENGTH}
          </span>
        </div>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
          rows={5}
          placeholder="Napiši nešto o sebi..."
        />
        <Button type="button" size="sm" onClick={handleSaveBio} disabled={isSavingBio}>
          <Save className="h-4 w-4" />
          {isSavingBio ? "Čuvanje..." : "Sačuvaj opis"}
        </Button>
      </div>

      <div className="space-y-3 border-t pt-4">
        <Label className="flex items-center gap-1.5">
          <KeyRound className="h-4 w-4" />
          Promena lozinke
        </Label>
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Trenutna lozinka"
            autoComplete="current-password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Nova lozinka (min. 6 karaktera)"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Potvrdi novu lozinku"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleChangePassword}
          disabled={isChangingPassword || !oldPassword || !newPassword}
        >
          <KeyRound className="h-4 w-4" />
          {isChangingPassword ? "Menjanje..." : "Promeni lozinku"}
        </Button>
      </div>
    </div>
  );
}
