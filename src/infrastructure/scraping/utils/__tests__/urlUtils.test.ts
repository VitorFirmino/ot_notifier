import { describe, it, expect } from "vitest";
import { isSensitiveServer } from "../urlUtils";

describe("isSensitiveServer", () => {
  it("marca os ids legados server1 e server2", () => {
    expect(isSensitiveServer("server1")).toBe(true);
    expect(isSensitiveServer("server2")).toBe(true);
  });

  it("não marca servidores cujo host apenas começa com server1/server2", () => {
    expect(isSensitiveServer("server1_ntobrasil_com_br_3857")).toBe(false);
    expect(isSensitiveServer("server2_dbobrasil_com_br")).toBe(false);
  });

  it("não marca servidores comuns nem id ausente", () => {
    expect(isSensitiveServer("dboinfinity_online")).toBe(false);
    expect(isSensitiveServer(undefined)).toBe(false);
  });
});
