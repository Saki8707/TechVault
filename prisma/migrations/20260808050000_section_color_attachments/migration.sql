-- Boja ikonice kategorije/podkategorije.
ALTER TABLE "Section" ADD COLUMN "color" TEXT;

-- Attachment sad moze biti vezan i za Section (ne samo za Article) - isti prilog
-- sistem (Word/PDF/itd.) za kategorije i podkategorije kao za dodatne fajlove.
ALTER TABLE "Attachment" ALTER COLUMN "articleId" DROP NOT NULL;
ALTER TABLE "Attachment" ADD COLUMN "sectionId" TEXT;

ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_target_check"
  CHECK (
    ("articleId" IS NOT NULL AND "sectionId" IS NULL) OR
    ("articleId" IS NULL AND "sectionId" IS NOT NULL)
  );
