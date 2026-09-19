import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { extractAllDeaths, extractDeathInfo } from "../deathParser";

describe("deathParser", () => {
  describe("classic template (Character Deaths header cell inside the table)", () => {
    const html = `
      <table border="0" cellspacing="1" cellpadding="4" width="100%">
        <tr bgcolor="#3a2358">
          <td colspan="2" class="white"><b>Character Deaths</b></td>
        </tr>
        <tr bgcolor="#1b1d22">
          <td width="20%" align="center">19 Sep 2026, 11:31</td>
          <td>Killed at level <b>684</b> by <a href="https://dboinfinity.online/?characters/Mariano">Mariano</a>.</td>
        </tr>
        <tr bgcolor="#25272d">
          <td width="20%" align="center">19 Sep 2026, 07:47</td>
          <td>Died at level <b>680</b> by undefined.</td>
        </tr>
        <tr bgcolor="#1b1d22">
          <td width="20%" align="center">19 Sep 2026, 01:27</td>
          <td>Died at level <b>683</b> by an Dragon Guardian.</td>
        </tr>
      </table>
    `;

    it("extracts every death row from the classic table layout", () => {
      const $ = cheerio.load(html);
      const deaths = extractAllDeaths($);

      expect(deaths).toHaveLength(3);
      expect(deaths[0]).toMatchObject({ level: 684, killers: ["Mariano"] });
    });

    it("keeps a death with no linked killer, with an empty killers list", () => {
      const $ = cheerio.load(html);
      const deaths = extractAllDeaths($);

      expect(deaths[1]).toMatchObject({ level: 680, killers: [] });
      expect(deaths[1].deathText).toContain("undefined");
    });

    it("extracts a death killed by an unlinked monster name", () => {
      const $ = cheerio.load(html);
      const deaths = extractAllDeaths($);

      expect(deaths[2]).toMatchObject({ level: 683, killers: [] });
      expect(deaths[2].deathText).toContain("an Dragon Guardian");
    });

    it("extractDeathInfo returns the most recent death", () => {
      const $ = cheerio.load(html);
      const death = extractDeathInfo($);

      expect(death).toMatchObject({ level: 684, killers: ["Mariano"] });
    });
  });

  describe("modern app template (heading with an icon, table in a sibling container)", () => {
    const html = `
      <div>
        <div class="card-header"><h2><svg class="lucide-skull"></svg>Mortes do Personagem</h2></div>
      </div>
      <div class="card-body">
        <div class="card-content">
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr><th>Data</th><th>Descrição</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>31 de ago. de 2026, 18:41</td>
                  <td>Morto no level <span class="font-semibold">840</span> por <span>the scourge of oblivion</span></td>
                </tr>
                <tr>
                  <td>26 de ago. de 2026, 20:39</td>
                  <td>Morto no level <span class="font-semibold">833</span> por <span>spark of destruction</span> (maior dano por <span>frenzy</span>)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    it("finds the table by walking forward from the deaths heading, even nested in sibling containers", () => {
      const $ = cheerio.load(html);
      const deaths = extractAllDeaths($);

      expect(deaths).toHaveLength(2);
      expect(deaths[0]).toMatchObject({ level: 840, killers: [] });
      expect(deaths[0].time).toBe("31 de ago. de 2026, 18:41");
      expect(deaths[1]).toMatchObject({ level: 833, killers: [] });
    });
  });

  describe("TableContainer whose real table sits inside decorative shadow-border wrapper tables", () => {
    const html = `
      <div class="TableContainer">
        <div class="CaptionContainer">
          <div class="CaptionInnerContainer">
            <div class="Text">Deaths</div>
          </div>
        </div>
        <table class="Table5" cellpadding="0" cellspacing="0">
          <tbody>
            <tr>
              <td>
                <div class="InnerTableContainer">
                  <table style="width:100%;">
                    <tbody>
                      <tr>
                        <td>
                          <table border="0" cellspacing="1" cellpadding="4" width="100%">
                            <tr bgcolor="#F1E0C6">
                              <td width="20%" align="center">19 Sep 2026, 13:22</td>
                              <td>Killed at level <b>238</b> by <a href="?subtopic=characters&name=Rip+Mateo">Rip Mateo</a> and by grim reaper.</td>
                            </tr>
                            <tr bgcolor="#D4C0A1">
                              <td width="20%" align="center">18 Sep 2026, 21:02</td>
                              <td>Killed at level <b>235</b> by <a href="?subtopic=characters&name=Nocauso">Nocauso</a> and by grim reaper.</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    it("extracts each death once, without merging rows from the wrapper tables", () => {
      const $ = cheerio.load(html);
      const deaths = extractAllDeaths($);

      expect(deaths).toHaveLength(2);
      expect(deaths[0]).toMatchObject({ level: 238, killers: ["Rip Mateo"] });
      expect(deaths[0].time).toBe("19 Sep 2026, 13:22");
      expect(deaths[1]).toMatchObject({ level: 235, killers: ["Nocauso"] });
    });
  });

  it("returns an empty array when there is no death table at all", () => {
    const $ = cheerio.load("<html><body><p>No deaths here.</p></body></html>");
    expect(extractAllDeaths($)).toEqual([]);
  });
});
