-- Bez NULLS NOT DISTINCT, Postgres bi dozvolio duplirane slug-ove medju top-level
-- kategorijama jer tretira parentId IS NULL vrednosti kao medjusobno razlicite.
DROP INDEX "Section_parentId_slug_key";
CREATE UNIQUE INDEX "Section_parentId_slug_key" ON "Section"("parentId", "slug") NULLS NOT DISTINCT;
