-- Profil korisnika: avatar (URL do slike) i kratak opis (bio).
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
