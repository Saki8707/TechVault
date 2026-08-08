-- Trigram pretraga (tolerantna na tipfelere) uz vec postojeci tsvector prefiks pretragu
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Article_title_trgm_idx" ON "Article" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Section_name_trgm_idx" ON "Section" USING GIN ("name" gin_trgm_ops);
