-- Section dobija sopstveni tekstualni sadrzaj (nezavisan od Article/dodatnih fajlova ispod nje).
ALTER TABLE "Section" ADD COLUMN "contentHtml" TEXT;
ALTER TABLE "Section" ADD COLUMN "contentUpdatedAt" TIMESTAMP(3);
ALTER TABLE "Section" ADD COLUMN "contentUpdatedById" TEXT;

ALTER TABLE "Section" ADD CONSTRAINT "Section_contentUpdatedById_fkey"
  FOREIGN KEY ("contentUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
