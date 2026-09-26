-- AlterTable
ALTER TABLE "prihlaska" ADD COLUMN     "zaplaceno" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "trasa" ADD COLUMN     "platba_castka" INTEGER,
ADD COLUMN     "platba_ucet" TEXT,
ADD COLUMN     "potvrzovaci_email_text" TEXT;

-- CreateTable
CREATE TABLE "registrace" (
    "id" TEXT NOT NULL,
    "trasa_id" TEXT NOT NULL,
    "prijmeni" TEXT NOT NULL,
    "jmeno" TEXT NOT NULL,
    "rocnik" INTEGER,
    "pohlavi" "Pohlavi",
    "klub" TEXT,
    "email" TEXT,
    "telefon" TEXT,
    "kategorie_id" TEXT NOT NULL,
    "nouzovy_kontakt" TEXT,
    "zdravotni_poznamka" TEXT,
    "oznamovaci_email" TEXT,
    "clenove_druzstva" JSONB,
    "vytvoreno_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registrace_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "registrace" ADD CONSTRAINT "registrace_trasa_id_fkey" FOREIGN KEY ("trasa_id") REFERENCES "trasa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrace" ADD CONSTRAINT "registrace_kategorie_id_fkey" FOREIGN KEY ("kategorie_id") REFERENCES "kategorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Multi-tenant RLS (F24) — nová tabulka musí mít stejnou izolaci jako
-- "prihlaska" (viz 20260919114728_add_multi_tenant_rls), jinak by čekající
-- registrace jedné organizace mohla být vidět/upravitelná z druhé.
ALTER TABLE registrace ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrace FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON registrace USING (app_tenant_ok_via_trasa(trasa_id));
