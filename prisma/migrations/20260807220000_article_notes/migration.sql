-- Napomene vezane za konkretan deo teksta u clanku (ne za ceo clanak): admin-only
-- (interna) i vidljiva-svima (za User i Guest naloge takodje) varijanta.
CREATE TYPE "NoteVisibility" AS ENUM ('ADMIN_ONLY', 'ALL_USERS');

CREATE TABLE "ArticleNote" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "anchorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'ADMIN_ONLY',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArticleNote_articleId_anchorId_key" ON "ArticleNote"("articleId", "anchorId");
CREATE INDEX "ArticleNote_articleId_idx" ON "ArticleNote"("articleId");

ALTER TABLE "ArticleNote" ADD CONSTRAINT "ArticleNote_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleNote" ADD CONSTRAINT "ArticleNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
