-- Tri nivoa naloga (Admin/User/Guest) umesto binarnog isAdmin, + eksplicitne READ
-- dozvole po kategoriji za User, + guestVisible oznaka za Guest sadrzaj.
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER', 'GUEST');

ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';
UPDATE "User" SET "role" = 'ADMIN' WHERE "isAdmin" = true;
ALTER TABLE "User" DROP COLUMN "isAdmin";

ALTER TABLE "Section" ADD COLUMN "guestVisible" BOOLEAN NOT NULL DEFAULT false;

-- canRead je nova eksplicitna dozvola (default-deny) - postojeci write grantovi su
-- ranije podrazumevali i citanje (read je bio otvoren svima), pa se ovde preslikavaju
-- da postojeci korisnici ne izgube pristup mestima gde su vec imali write.
ALTER TABLE "SectionPermission" ADD COLUMN "canRead" BOOLEAN NOT NULL DEFAULT false;
UPDATE "SectionPermission" SET "canRead" = true WHERE "canWrite" = true;
ALTER TABLE "SectionPermission" ALTER COLUMN "canWrite" SET DEFAULT false;
