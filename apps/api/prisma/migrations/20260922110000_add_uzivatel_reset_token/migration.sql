-- AlterTable
ALTER TABLE "uzivatel" ADD COLUMN     "reset_token_hash" TEXT,
ADD COLUMN     "reset_token_expiruje" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "uzivatel_reset_token_hash_idx" ON "uzivatel"("reset_token_hash");
