import { describe, it, expect } from "vitest";
import { discoverGuildsFromList } from "../guildParser";

describe("discoverGuildsFromList - logos", () => {
  const base = "https://baiak-ilusion.com.br/?subtopic=guilds";

  it("resolve logo em caminho relativo sob images/guilds", () => {
    const html = `
      <table><tr>
        <td><a href="?subtopic=guilds&action=view&GuildName=Verminose">
          <img src="images/guilds/777.gif?v=1790028000"></a></td>
      </tr></table>
    `;

    const guildas = discoverGuildsFromList(html, base);

    expect(guildas).toHaveLength(1);
    expect(guildas[0].logoUrl).toBe("https://baiak-ilusion.com.br/images/guilds/777.gif?v=1790028000");
  });

  it("continua lendo os nomes antigos de logo", () => {
    const html = `
      <table><tr>
        <td><a href="?subtopic=guilds&action=view&GuildName=Antiga">
          <img src="/images/default_guild_logo.gif"></a></td>
      </tr></table>
    `;

    expect(discoverGuildsFromList(html, base)[0].logoUrl).toBe(
      "https://baiak-ilusion.com.br/images/default_guild_logo.gif"
    );
  });
});
