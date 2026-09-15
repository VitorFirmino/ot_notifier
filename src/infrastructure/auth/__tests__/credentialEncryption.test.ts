import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("credentialEncryption", () => {
  const originalKey = process.env.CREDENTIALS_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = "de6WyZTggOkkx6XCpuPxen1ypLjkH2zDq5epou8uqoU=";
  });

  afterEach(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = originalKey;
  });

  it("round-trips a plaintext password through encrypt/decrypt", async () => {
    const { encryptSecret, decryptSecret } = await import("../credentialEncryption");
    const encrypted = encryptSecret("deweda@123");
    expect(encrypted).not.toContain("deweda@123");
    expect(decryptSecret(encrypted)).toBe("deweda@123");
  });

  it("produces different ciphertext for the same plaintext each time (random IV)", async () => {
    const { encryptSecret } = await import("../credentialEncryption");
    const first = encryptSecret("same-password");
    const second = encryptSecret("same-password");
    expect(first).not.toBe(second);
  });

  it("throws a clear error when CREDENTIALS_ENCRYPTION_KEY is missing", async () => {
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    const { encryptSecret } = await import("../credentialEncryption");
    expect(() => encryptSecret("x")).toThrow("CREDENTIALS_ENCRYPTION_KEY não configurada");
  });

  it("fails to decrypt with a different key (tamper/wrong-key detection)", async () => {
    const { encryptSecret, decryptSecret } = await import("../credentialEncryption");
    const encrypted = encryptSecret("deweda@123");
    process.env.CREDENTIALS_ENCRYPTION_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    expect(() => decryptSecret(encrypted)).toThrow();
  });
});
