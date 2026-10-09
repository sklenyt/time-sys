-- Sklad čipů organizace: fyzický čip existuje nezávisle na konkrétním závodě.
-- Vydání čipu přihlášce zůstává v tabulce "cip" a odkazuje na sklad.

CREATE TYPE "TypCipu" AS ENUM ('OPAKOVANY', 'JEDNORAZOVY');
CREATE TYPE "StavSkladuCipu" AS ENUM ('SKLADEM', 'VYDAN', 'ZTRACEN', 'VYRAZEN');

CREATE TABLE "cip_sklad" (
    "id" TEXT NOT NULL,
    "organizace_id" TEXT NOT NULL,
    "kod_cipu" TEXT NOT NULL,
    "stitek" TEXT,
    "poznamka" TEXT,
    "typ" "TypCipu" NOT NULL DEFAULT 'OPAKOVANY',
    "stav" "StavSkladuCipu" NOT NULL DEFAULT 'SKLADEM',
    "vytvoreno_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cip_sklad_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cip_sklad_organizace_id_kod_cipu_key" ON "cip_sklad"("organizace_id", "kod_cipu");

ALTER TABLE "cip_sklad" ADD CONSTRAINT "cip_sklad_organizace_id_fkey"
  FOREIGN KEY ("organizace_id") REFERENCES "organizace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cip" ADD COLUMN "sklad_id" TEXT;
ALTER TABLE "cip" ADD CONSTRAINT "cip_sklad_id_fkey"
  FOREIGN KEY ("sklad_id") REFERENCES "cip_sklad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Izolace organizací (stejný tvar jako u ostatních tabulek).
ALTER TABLE cip_sklad ENABLE ROW LEVEL SECURITY;
ALTER TABLE cip_sklad FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON cip_sklad
  USING (
    current_setting('app.current_org', true) IS NULL
    OR current_setting('app.current_org', true) = ''
    OR organizace_id::text = current_setting('app.current_org', true)
  );

-- Převod stávajících čipů do skladů organizací. Jeden kód v jedné organizaci
-- = jeden záznam ve skladu; když je kód u více výdejů, vyhraje aktivní výdej,
-- pak nejnovější.
INSERT INTO cip_sklad (id, organizace_id, kod_cipu, typ, stav)
SELECT DISTINCT ON (u.organizace_id, c.kod_cipu)
  gen_random_uuid()::text,
  u.organizace_id,
  c.kod_cipu,
  'OPAKOVANY'::"TypCipu",
  CASE c.stav
    WHEN 'PRIREZEN' THEN 'VYDAN'
    WHEN 'ZALOZNI' THEN 'VYDAN'
    WHEN 'ZTRACEN' THEN 'ZTRACEN'
    ELSE 'SKLADEM'
  END::"StavSkladuCipu"
FROM cip c
JOIN prihlaska p ON p.id = c.prihlaska_id
JOIN trasa t ON t.id = p.trasa_id
JOIN udalost u ON u.id = t.udalost_id
ORDER BY u.organizace_id, c.kod_cipu,
  (c.stav IN ('PRIREZEN', 'ZALOZNI')) DESC,
  c.vydano_at DESC NULLS LAST;

UPDATE cip c
SET sklad_id = s.id
FROM prihlaska p
JOIN trasa t ON t.id = p.trasa_id
JOIN udalost u ON u.id = t.udalost_id
JOIN cip_sklad s ON s.organizace_id = u.organizace_id
WHERE p.id = c.prihlaska_id AND s.kod_cipu = c.kod_cipu;
