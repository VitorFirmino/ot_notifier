import { describe, it, expect } from "vitest";
import { parseCharacterFromHtml } from "../characterParser";

describe("characterParser", () => {
  it("lê o nível de uma ficha em espanhol (RubinOT)", () => {
    const html = `
      <table>
        <tr><td>Nombre:</td><td>Black Smook</td></tr>
        <tr><td>Vocación:</td><td>Elite Knight</td></tr>
        <tr><td>Nivel:</td><td>771</td></tr>
        <tr><td>Mundo:</td><td>Auroria</td></tr>
      </table>
    `;

    const personagem = parseCharacterFromHtml(html, "Black Smook", "https://rubinot.com.br/characters?name=Black%20Smook");

    expect(personagem.level).toBe(771);
  });

  it("continua lendo o nível em inglês e português", () => {
    const ingles = `<table><tr><td>Level:</td><td>500</td></tr></table>`;
    const portugues = `<table><tr><td>Nível:</td><td>300</td></tr></table>`;

    expect(parseCharacterFromHtml(ingles, "X", "https://exemplo.com").level).toBe(500);
    expect(parseCharacterFromHtml(portugues, "X", "https://exemplo.com").level).toBe(300);
  });

  it("devolve nível nulo quando a ficha não traz o campo", () => {
    const semNivel = `<table><tr><td>Mundo:</td><td>Auroria</td></tr></table>`;

    expect(parseCharacterFromHtml(semNivel, "X", "https://exemplo.com").level).toBeNull();
  });
});
