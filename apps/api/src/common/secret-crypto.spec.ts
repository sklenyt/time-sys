import { encryptSecret, decryptSecret } from "./secret-crypto";

describe("secret-crypto", () => {
  const ORIGINAL_ENV = process.env.PUBLISH_TARGET_ENC_KEY;

  beforeEach(() => {
    process.env.PUBLISH_TARGET_ENC_KEY = "a".repeat(64); // 32 bajtů jako hex
  });

  afterAll(() => {
    process.env.PUBLISH_TARGET_ENC_KEY = ORIGINAL_ENV;
  });

  it("round-trips plaintext through encrypt/decrypt", () => {
    const plaintext = "heslo123!";
    const ciphertext = encryptSecret(plaintext);
    expect(decryptSecret(ciphertext)).toBe(plaintext);
  });

  it("round-trips unicode (české diakritice) beze ztráty", () => {
    const plaintext = "Nouzový kontakt: Jiří Novák, +420 777 123 456";
    expect(decryptSecret(encryptSecret(plaintext))).toBe(plaintext);
  });

  it("never stores the plaintext in the ciphertext string", () => {
    const plaintext = "citlivá zdravotní poznámka";
    expect(encryptSecret(plaintext)).not.toContain(plaintext);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const plaintext = "stejný vstup";
    expect(encryptSecret(plaintext)).not.toBe(encryptSecret(plaintext));
  });

  it("throws on tampered ciphertext (auth tag mismatch)", () => {
    const ciphertext = encryptSecret("tajemství");
    const [iv, authTag, data] = ciphertext.split(":");
    const tampered = [iv, authTag, data.slice(0, -2) + "00"].join(":");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws when PUBLISH_TARGET_ENC_KEY is missing", () => {
    delete process.env.PUBLISH_TARGET_ENC_KEY;
    expect(() => encryptSecret("cokoli")).toThrow(/PUBLISH_TARGET_ENC_KEY/);
  });

  it("throws when PUBLISH_TARGET_ENC_KEY has the wrong length", () => {
    process.env.PUBLISH_TARGET_ENC_KEY = "prilis-kratky-klic";
    expect(() => encryptSecret("cokoli")).toThrow(/PUBLISH_TARGET_ENC_KEY/);
  });
});
