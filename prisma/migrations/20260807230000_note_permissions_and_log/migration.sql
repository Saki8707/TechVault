-- Napomene: dozvoli User nalozima (ne samo adminu) da ostavljaju/menjaju napomene bez
-- write pristupa, preko blok-nivo sidra (blockId) umesto precizne selekcije u editoru.
ALTER TABLE "ArticleNote" ADD COLUMN "blockId" TEXT;
CREATE INDEX "ArticleNote_blockId_idx" ON "ArticleNote"("blockId");

-- Log svake izmene napomene (ko je sta napisao/izmenio/obrisao) - admin-only prikaz.
CREATE TYPE "NoteAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED');

CREATE TABLE "NoteAuditLog" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "anchorId" TEXT NOT NULL,
    "action" "NoteAction" NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "NoteVisibility" NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NoteAuditLog_articleId_idx" ON "NoteAuditLog"("articleId");
CREATE INDEX "NoteAuditLog_createdAt_idx" ON "NoteAuditLog"("createdAt");

ALTER TABLE "NoteAuditLog" ADD CONSTRAINT "NoteAuditLog_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoteAuditLog" ADD CONSTRAINT "NoteAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
