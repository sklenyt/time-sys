-- Uživatel může patřit do víc organizací. uzivatel.organizace_id zůstává jeho
-- aktivní organizací (podle ní se řídí izolace dat), členství jsou v nové tabulce.

CREATE TABLE "clenstvi_organizace" (
    "id" TEXT NOT NULL,
    "uzivatel_id" TEXT NOT NULL,
    "organizace_id" TEXT NOT NULL,
    "vytvoreno_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clenstvi_organizace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clenstvi_organizace_uzivatel_id_organizace_id_key"
  ON "clenstvi_organizace"("uzivatel_id", "organizace_id");

ALTER TABLE "clenstvi_organizace" ADD CONSTRAINT "clenstvi_organizace_uzivatel_id_fkey"
  FOREIGN KEY ("uzivatel_id") REFERENCES "uzivatel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clenstvi_organizace" ADD CONSTRAINT "clenstvi_organizace_organizace_id_fkey"
  FOREIGN KEY ("organizace_id") REFERENCES "organizace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Stávající uživatelé jsou členy své dosavadní organizace.
INSERT INTO clenstvi_organizace (id, uzivatel_id, organizace_id)
SELECT gen_random_uuid()::text, id, organizace_id
FROM uzivatel
WHERE organizace_id IS NOT NULL;
