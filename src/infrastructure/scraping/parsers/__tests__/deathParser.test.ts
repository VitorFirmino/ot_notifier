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

  it("returns an empty array when there is no death table at all", () => {
    const $ = cheerio.load("<html><body><p>No deaths here.</p></body></html>");
    expect(extractAllDeaths($)).toEqual([]);
  });
});
