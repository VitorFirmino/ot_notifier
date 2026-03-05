import { afterEach, describe, expect, it } from "vitest";
import { getWebhookUrl } from "../webhookUtils";

const ORIGINAL_ENV = { ...process.env };

describe("webhookUtils", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns exact server env webhook when configured", () => {
    process.env.WEBHOOK_URL_OTDBO_MORRO_DO_PAPEL_CAGADO = "https://discord.com/api/webhooks/exact";

    const webhook = getWebhookUrl({
      serverId: "otdbo_morro_do_papel_cagado",
      guild: {},
    });

    expect(webhook).toBe("https://discord.com/api/webhooks/exact");
  });

  it("falls back to grouped env webhook for server families", () => {
    process.env.WEBHOOK_URL_OTDBO = "https://discord.com/api/webhooks/grouped";

    const webhook = getWebhookUrl({
      serverId: "otdbo_rank_a",
      guild: {},
    });

    expect(webhook).toBe("https://discord.com/api/webhooks/grouped");
  });

  it("prefers exact match over grouped when both exist", () => {
    process.env.WEBHOOK_URL_OTDBO = "https://discord.com/api/webhooks/grouped";
    process.env.WEBHOOK_URL_OTDBO_RANK_A = "https://discord.com/api/webhooks/exact";

    const webhook = getWebhookUrl({
      serverId: "otdbo_rank_a",
      guild: {},
    });

    expect(webhook).toBe("https://discord.com/api/webhooks/exact");
  });

  it("falls back to global env webhook", () => {
    process.env.WEBHOOK_URL = "https://discord.com/api/webhooks/global";

    const webhook = getWebhookUrl({
      serverId: "server_without_specific_webhook",
      guild: {},
    });

    expect(webhook).toBe("https://discord.com/api/webhooks/global");
  });

  it("uses guild webhook when env variables are missing", () => {
    const webhook = getWebhookUrl({
      serverId: "server_without_env",
      guild: { webhookUrl: "https://discord.com/api/webhooks/guild" },
    });

    expect(webhook).toBe("https://discord.com/api/webhooks/guild");
  });

  it("prefers env over guild.webhookUrl", () => {
    process.env.WEBHOOK_URL_SERVER1 = "https://discord.com/api/webhooks/env";

    const webhook = getWebhookUrl({
      serverId: "server1",
      guild: { webhookUrl: "https://discord.com/api/webhooks/json" },
    });

    expect(webhook).toBe("https://discord.com/api/webhooks/env");
  });

  it("throws when no webhook is configured", () => {
    expect(() =>
      getWebhookUrl({
        serverId: "server_with_no_webhook",
        guild: {},
      })
    ).toThrow("webhookUrl não configurado");
  });

  it("throws error message containing server ID for easy diagnosis", () => {
    expect(() =>
      getWebhookUrl({
        serverId: "myserver",
        guild: {},
      })
    ).toThrow("WEBHOOK_URL_MYSERVER");
  });

  it("falls back to DISCORD_WEBHOOK_URL global env", () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/discord_global";

    const webhook = getWebhookUrl({
      serverId: "server_without_specific_webhook",
      guild: {},
    });

    expect(webhook).toBe("https://discord.com/api/webhooks/discord_global");
  });

  it("handles multi-segment prefix matching (BAIAK_ILUSION matches baiak_ilusion_israel)", () => {
    process.env.WEBHOOK_URL_BAIAK_ILUSION = "https://discord.com/api/webhooks/baiak";

    const webhook = getWebhookUrl({
      serverId: "baiak_ilusion_israel",
      guild: {},
    });

    expect(webhook).toBe("https://discord.com/api/webhooks/baiak");
  });
});
