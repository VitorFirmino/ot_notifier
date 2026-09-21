import { describe, it, expect } from "vitest";
import { looksLikeServerPage } from "../guildRouteDiscovery";

describe("looksLikeServerPage", () => {
  it("não considera servidor um portal que apenas ecoa a URL pedida", () => {
    const portal = `<html><head><title>RubinOT Servers</title>
      <meta property="og:url" content="https://rubinot.com/?subtopic=guildlist">
      </head><body><div>Players Online: 10959</div>
      <a href="https://wiki.rubinot.com/">Wiki</a></body></html>`;

    expect(looksLikeServerPage(portal)).toBe(false);
  });

  it("reconhece uma página de servidor pelos vários marcadores", () => {
    const servidor = `<html><body>
      <a href="?subtopic=highscores">Highscores</a>
      <a href="?subtopic=guilds">Guilds</a>
      <a href="/guilds/Vs+All">Vs All</a>
      </body></html>`;

    expect(looksLikeServerPage(servidor)).toBe(true);
  });

  it("trata html vazio como não sendo servidor", () => {
    expect(looksLikeServerPage("")).toBe(false);
  });
});
