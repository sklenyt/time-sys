-- AlterTable
ALTER TABLE "udalost" ADD COLUMN     "verejny_vypis" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "heslo_vysledku_hash" TEXT;
