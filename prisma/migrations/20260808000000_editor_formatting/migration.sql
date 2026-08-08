-- Boja ikonice prilozenog fajla
ALTER TABLE "Attachment" ADD COLUMN "color" TEXT;

-- Custom emoji koje admin otpremi (pored standardnog Unicode seta u editoru)
CREATE TABLE "CustomEmoji" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomEmoji_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomEmoji_name_key" ON "CustomEmoji"("name");

ALTER TABLE "CustomEmoji" ADD CONSTRAINT "CustomEmoji_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
