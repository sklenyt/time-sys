-- CreateEnum
CREATE TYPE "Pohlavi" AS ENUM ('M', 'Z');

-- CreateEnum
CREATE TYPE "TypStartu" AS ENUM ('HROMADNY', 'VLNOVY', 'INTERVALOVY');

-- CreateEnum
CREATE TYPE "TypUdalosti" AS ENUM ('START', 'DOJEZD', 'MEZICAS', 'OPRAVA', 'DNS', 'DNF', 'DQ');

-- CreateEnum
CREATE TYPE "TypOpravy" AS ENUM ('ORIGINAL', 'PREPIS_POSLEDNIHO_RADKU', 'PREPIS_NULY_NA_CISLO', 'PREPSANE_CISLO', 'ZMENA_V_UPRAVACH');

-- CreateEnum
CREATE TYPE "StavZaznamu" AS ENUM ('OK', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "StavUkonceni" AS ENUM ('DNS', 'DNF', 'DQ');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ORGANIZATOR', 'CASOMERIC', 'STANOVISTE', 'VEREJNOST');

-- CreateEnum
CREATE TYPE "TypZarizeni" AS ENUM ('CIL', 'STANOVISTE');

-- CreateEnum
CREATE TYPE "StavCipu" AS ENUM ('PRIREZEN', 'VRACEN', 'ZTRACEN', 'ZALOZNI');

-- CreateEnum
CREATE TYPE "ProtokolPublikace" AS ENUM ('FTP', 'FTPS', 'SFTP');

-- CreateEnum
CREATE TYPE "StavExportu" AS ENUM ('OK', 'CHYBA');

-- CreateTable
CREATE TABLE "organizace" (
    "id" TEXT NOT NULL,
    "nazev" TEXT NOT NULL,
    "vytvoreno_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uzivatel" (
    "id" TEXT NOT NULL,
    "organizace_id" TEXT,
    "email" TEXT NOT NULL,
    "jmeno" TEXT NOT NULL,
    "heslo_hash" TEXT NOT NULL,
    "vytvoreno_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uzivatel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "udalost" (
    "id" TEXT NOT NULL,
    "organizace_id" TEXT NOT NULL,
    "nazev" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "html_hlavicka" TEXT,
    "logo_url" TEXT,

    CONSTRAINT "udalost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trasa" (
    "id" TEXT NOT NULL,
    "udalost_id" TEXT NOT NULL,
    "nazev" TEXT NOT NULL,
    "delka_km" DOUBLE PRECISION,
    "pocet_kol" INTEGER NOT NULL DEFAULT 1,
    "typ_startu" "TypStartu" NOT NULL,
    "dokoncena" BOOLEAN NOT NULL DEFAULT false,
    "export_soubor_nazev" TEXT,

    CONSTRAINT "trasa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kategorie" (
    "id" TEXT NOT NULL,
    "trasa_id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "nazev" TEXT NOT NULL,
    "pohlavi" "Pohlavi" NOT NULL,
    "rocnik_od" INTEGER,
    "rocnik_do" INTEGER,

    CONSTRAINT "kategorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "start_vlna" (
    "id" TEXT NOT NULL,
    "trasa_id" TEXT NOT NULL,
    "nazev" TEXT NOT NULL,
    "cas_startu" TIMESTAMP(3),
    "odklad_sekund" INTEGER,

    CONSTRAINT "start_vlna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prihlaska" (
    "id" TEXT NOT NULL,
    "trasa_id" TEXT NOT NULL,
    "startovni_cislo" INTEGER NOT NULL,
    "prijmeni" TEXT NOT NULL,
    "jmeno" TEXT NOT NULL,
    "rocnik" INTEGER,
    "pohlavi" "Pohlavi",
    "klub" TEXT,
    "email" TEXT,
    "telefon" TEXT,
    "kategorie_id" TEXT NOT NULL,
    "start_vlna_id" TEXT,
    "registrovan" BOOLEAN NOT NULL DEFAULT true,
    "nouzovy_kontakt" TEXT,
    "zdravotni_poznamka" TEXT,
    "stav_ukonceni" "StavUkonceni",
    "casova_penalizace_s" INTEGER,
    "clenove_druzstva" JSONB,

    CONSTRAINT "prihlaska_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cip" (
    "id" TEXT NOT NULL,
    "prihlaska_id" TEXT NOT NULL,
    "kod_cipu" TEXT NOT NULL,
    "stav" "StavCipu" NOT NULL DEFAULT 'PRIREZEN',
    "zalozni" BOOLEAN NOT NULL DEFAULT false,
    "vratna_zaloha" DECIMAL(10,2),
    "vydano_at" TIMESTAMP(3),
    "vraceno_at" TIMESTAMP(3),

    CONSTRAINT "cip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zarizeni" (
    "id" TEXT NOT NULL,
    "nazev" TEXT NOT NULL,
    "typ" "TypZarizeni" NOT NULL,
    "posledni_sync_at" TIMESTAMP(3),

    CONSTRAINT "zarizeni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zaznam_udalosti" (
    "id" TEXT NOT NULL,
    "trasa_id" TEXT NOT NULL,
    "prihlaska_id" TEXT,
    "startovni_cislo_raw" INTEGER,
    "typ_udalosti" "TypUdalosti" NOT NULL,
    "cas" TIMESTAMP(3) NOT NULL,
    "zarizeni_id" TEXT NOT NULL,
    "uzivatel_id" TEXT,
    "typ_opravy" "TypOpravy" NOT NULL DEFAULT 'ORIGINAL',
    "nahrazuje_zaznam_id" TEXT,
    "stav" "StavZaznamu" NOT NULL DEFAULT 'OK',
    "vytvoreno_klient_at" TIMESTAMP(3) NOT NULL,
    "prijato_server_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "klient_event_id" TEXT NOT NULL,

    CONSTRAINT "zaznam_udalosti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uzivatel_role" (
    "id" TEXT NOT NULL,
    "uzivatel_id" TEXT NOT NULL,
    "udalost_id" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "uzivatel_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "uzivatel_id" TEXT,
    "entita" TEXT NOT NULL,
    "entita_id" TEXT NOT NULL,
    "puvodni_hodnota" JSONB,
    "nova_hodnota" JSONB,
    "cas" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publikacni_cil" (
    "id" TEXT NOT NULL,
    "udalost_id" TEXT NOT NULL,
    "protokol" "ProtokolPublikace" NOT NULL,
    "server" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "cesta" TEXT NOT NULL,
    "uzivatel" TEXT NOT NULL,
    "heslo_sifrovane" TEXT NOT NULL,
    "interval_minut" INTEGER NOT NULL DEFAULT 5,
    "export_po_kazdem_zaznamu" BOOLEAN NOT NULL DEFAULT false,
    "html_sablona" TEXT,
    "posledni_export_at" TIMESTAMP(3),
    "posledni_export_stav" "StavExportu",

    CONSTRAINT "publikacni_cil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uzivatel_email_key" ON "uzivatel"("email");

-- CreateIndex
CREATE UNIQUE INDEX "kategorie_trasa_id_kod_key" ON "kategorie"("trasa_id", "kod");

-- CreateIndex
CREATE UNIQUE INDEX "prihlaska_trasa_id_startovni_cislo_key" ON "prihlaska"("trasa_id", "startovni_cislo");

-- CreateIndex
CREATE UNIQUE INDEX "cip_prihlaska_id_key" ON "cip"("prihlaska_id");

-- CreateIndex
CREATE UNIQUE INDEX "cip_kod_cipu_stav_key" ON "cip"("kod_cipu", "stav");

-- CreateIndex
CREATE UNIQUE INDEX "zaznam_udalosti_klient_event_id_key" ON "zaznam_udalosti"("klient_event_id");

-- CreateIndex
CREATE INDEX "zaznam_udalosti_trasa_id_cas_idx" ON "zaznam_udalosti"("trasa_id", "cas");

-- CreateIndex
CREATE INDEX "zaznam_udalosti_prihlaska_id_idx" ON "zaznam_udalosti"("prihlaska_id");

-- CreateIndex
CREATE INDEX "zaznam_udalosti_startovni_cislo_raw_idx" ON "zaznam_udalosti"("startovni_cislo_raw");

-- CreateIndex
CREATE UNIQUE INDEX "uzivatel_role_uzivatel_id_udalost_id_role_key" ON "uzivatel_role"("uzivatel_id", "udalost_id", "role");

-- AddForeignKey
ALTER TABLE "uzivatel" ADD CONSTRAINT "uzivatel_organizace_id_fkey" FOREIGN KEY ("organizace_id") REFERENCES "organizace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "udalost" ADD CONSTRAINT "udalost_organizace_id_fkey" FOREIGN KEY ("organizace_id") REFERENCES "organizace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trasa" ADD CONSTRAINT "trasa_udalost_id_fkey" FOREIGN KEY ("udalost_id") REFERENCES "udalost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kategorie" ADD CONSTRAINT "kategorie_trasa_id_fkey" FOREIGN KEY ("trasa_id") REFERENCES "trasa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "start_vlna" ADD CONSTRAINT "start_vlna_trasa_id_fkey" FOREIGN KEY ("trasa_id") REFERENCES "trasa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prihlaska" ADD CONSTRAINT "prihlaska_trasa_id_fkey" FOREIGN KEY ("trasa_id") REFERENCES "trasa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prihlaska" ADD CONSTRAINT "prihlaska_kategorie_id_fkey" FOREIGN KEY ("kategorie_id") REFERENCES "kategorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prihlaska" ADD CONSTRAINT "prihlaska_start_vlna_id_fkey" FOREIGN KEY ("start_vlna_id") REFERENCES "start_vlna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cip" ADD CONSTRAINT "cip_prihlaska_id_fkey" FOREIGN KEY ("prihlaska_id") REFERENCES "prihlaska"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zaznam_udalosti" ADD CONSTRAINT "zaznam_udalosti_trasa_id_fkey" FOREIGN KEY ("trasa_id") REFERENCES "trasa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zaznam_udalosti" ADD CONSTRAINT "zaznam_udalosti_prihlaska_id_fkey" FOREIGN KEY ("prihlaska_id") REFERENCES "prihlaska"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zaznam_udalosti" ADD CONSTRAINT "zaznam_udalosti_zarizeni_id_fkey" FOREIGN KEY ("zarizeni_id") REFERENCES "zarizeni"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zaznam_udalosti" ADD CONSTRAINT "zaznam_udalosti_uzivatel_id_fkey" FOREIGN KEY ("uzivatel_id") REFERENCES "uzivatel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uzivatel_role" ADD CONSTRAINT "uzivatel_role_uzivatel_id_fkey" FOREIGN KEY ("uzivatel_id") REFERENCES "uzivatel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uzivatel_role" ADD CONSTRAINT "uzivatel_role_udalost_id_fkey" FOREIGN KEY ("udalost_id") REFERENCES "udalost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_uzivatel_id_fkey" FOREIGN KEY ("uzivatel_id") REFERENCES "uzivatel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publikacni_cil" ADD CONSTRAINT "publikacni_cil_udalost_id_fkey" FOREIGN KEY ("udalost_id") REFERENCES "udalost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
