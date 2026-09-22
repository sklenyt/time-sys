-- AlterTable
ALTER TABLE "uzivatel" ADD COLUMN     "poradi_menu" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
