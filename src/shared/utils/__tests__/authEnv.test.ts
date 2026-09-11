import { describe, it, expect, beforeEach } from "vitest";
import { getAuthEnv } from "../authEnv";

const ORIGINAL_ENV = { ...process.env };

const REQUIRED_ENV = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  BETTER_AUTH_SECRET: "test-secret",
  RESEND_API_KEY: "test-resend-key",
};

describe("getAuthEnv", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, ...REQUIRED_ENV };
    delete process.env.BETTER_AUTH_URL;
  });

  it("allows BETTER_AUTH_URL to be unset", () => {
    expect(() => getAuthEnv()).not.toThrow();
  });

  it("allows an https BETTER_AUTH_URL", () => {
    process.env.BETTER_AUTH_URL = "https://notifier.example.com";
    expect(() => getAuthEnv()).not.toThrow();
  });

  it("allows an http BETTER_AUTH_URL on localhost", () => {
    process.env.BETTER_AUTH_URL = "http://localhost:3001";
    expect(() => getAuthEnv()).not.toThrow();
  });

  it("allows an http BETTER_AUTH_URL on 127.0.0.1", () => {
    process.env.BETTER_AUTH_URL = "http://127.0.0.1:3001";
    expect(() => getAuthEnv()).not.toThrow();
  });

  it("rejects a non-localhost http BETTER_AUTH_URL", () => {
    process.env.BETTER_AUTH_URL = "http://notifier.example.com";
    expect(() => getAuthEnv()).toThrow(/BETTER_AUTH_URL/);
  });

  it("rejects a malformed BETTER_AUTH_URL", () => {
    process.env.BETTER_AUTH_URL = "not-a-url";
    expect(() => getAuthEnv()).toThrow(/BETTER_AUTH_URL/);
  });
});
