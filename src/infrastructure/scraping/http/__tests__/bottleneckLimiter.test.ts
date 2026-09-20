import { describe, it, expect } from "vitest";
import { getBottleneckLimiter } from "../bottleneckLimiter";

describe("getBottleneckLimiter", () => {
  it("compartilha o mesmo limitador entre guilds do mesmo domínio", () => {
    expect(getBottleneckLimiter("server1.ntobrasil.com.br")).toBe(
      getBottleneckLimiter("server1.ntobrasil.com.br")
    );
  });

  it("isola domínios diferentes em limitadores próprios", () => {
    expect(getBottleneckLimiter("server1.ntobrasil.com.br")).not.toBe(
      getBottleneckLimiter("dboinfinity.online")
    );
  });
});
