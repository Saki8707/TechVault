-- Tag model: imenovani tagovi sa opcionom admin-definisanom destinacijom (clanak/kategorija/URL)
CREATE TYPE "TagTargetType" AS ENUM ('ARTICLE', 'SECTION', 'URL', 'NONE');

CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetType" "TagTargetType" NOT NULL DEFAULT 'NONE',
    "targetArticleId" TEXT,
    "targetSectionId" TEXT,
    "targetUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

ALTER TABLE "Tag" ADD CONSTRAINT "Tag_targetArticleId_fkey" FOREIGN KEY ("targetArticleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_targetSectionId_fkey" FOREIGN KEY ("targetSectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ArticleTag" (
    "articleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ArticleTag_pkey" PRIMARY KEY ("articleId","tagId")
);

CREATE INDEX "ArticleTag_tagId_idx" ON "ArticleTag"("tagId");

ALTER TABLE "ArticleTag" ADD CONSTRAINT "ArticleTag_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleTag" ADD CONSTRAINT "ArticleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migracija: postojeci Article.tags (text[]) -> Tag zapisi + ArticleTag veze, bez gubitka podataka
INSERT INTO "Tag" ("id", "name", "targetType", "createdAt")
SELECT gen_random_uuid()::text, x.t, 'NONE', now()
FROM (SELECT DISTINCT unnest("tags") AS t FROM "Article") x
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "ArticleTag" ("articleId", "tagId")
SELECT a."id", tg."id"
FROM "Article" a
CROSS JOIN LATERAL unnest(a."tags") AS at(tagname)
JOIN "Tag" tg ON tg."name" = at.tagname
ON CONFLICT DO NOTHING;

-- searchVector je generisana kolona koja zavisi od "tags" (setweight 'B') - mora se
-- privremeno ukloniti pre DROP COLUMN i ponovo napraviti bez tag-weighting-a (tagovi
-- se sada pretrazuju/pretrazuju preko Tag/ArticleTag tabela, ne preko tsvector-a)
DROP INDEX "Article_searchVector_idx";
ALTER TABLE "Article" DROP COLUMN "searchVector";
ALTER TABLE "Article" DROP COLUMN "tags";

ALTER TABLE "Article" ADD COLUMN "searchVector" tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('simple'::regconfig, coalesce("title", '')), 'A') ||
        setweight(to_tsvector('simple'::regconfig, coalesce("contentText", '')), 'C')
    ) STORED;

CREATE INDEX "Article_searchVector_idx" ON "Article" USING GIN ("searchVector");
