-- AlterTable
ALTER TABLE "udalost" ADD COLUMN     "verejna_reference" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "misto" TEXT,
ADD COLUMN     "misto_lat" DOUBLE PRECISION,
ADD COLUMN     "misto_lon" DOUBLE PRECISION;
