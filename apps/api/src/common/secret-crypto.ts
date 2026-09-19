import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const hex = process.env.PUBLISH_TARGET_ENC_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("PUBLISH_TARGET_ENC_KEY musí být nastaven na 32 bajtů (64 hex znaků)");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Šifrování citlivých polí (FTP/SFTP heslo) uložených v databázi (F34,
 * 08-security.md §8.4) — nikdy plain-text ve sloupci, na rozdíl od
 * ftpheslo/smtpheslo v legacy schématu.
 */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), ciphertext.toString("hex")].join(":");
}

export function decryptSecret(stored: string): string {
  const [ivHex, authTagHex, ciphertextHex] = stored.split(":");
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]);
  return plaintext.toString("utf8");
}
