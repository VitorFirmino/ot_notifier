import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { getCharacterStatus, getGuildMembers, getAllDeaths } from "../scraper";

vi.mock("axios");
const mockedAxiosGet = vi.mocked(axios.get);

vi.mock("../playwrightManager", () => ({
  playwrightManager: null,
}));

describe("Scraper - getCharacterStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should extract level and online status correctly", async () => {
    const mockHtml = `
      <html>
        <body>
          <div>
            <p>Level: 150</p>
            <p>Status: online</p>
          </div>
        </body>
      </html>
    `;

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: mockHtml,
    });

    const result = await getCharacterStatus(
      "SrGUSTAVO",
      "https://example.com/character/view/SrGUSTAVO",
      undefined,
      "server1"
    );

    expect(result).toMatchObject({
      name: "SrGUSTAVO",
      level: 150,
      isOnline: true,
    });
  });

  it("should detect offline character", async () => {
    const mockHtml = `
      <html>
        <body>
          <div>
            <p>Level: 100</p>
            <p>Status: offline</p>
          </div>
        </body>
      </html>
    `;

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: mockHtml,
    });

    const result = await getCharacterStatus(
      "TerrorZone",
      "https://example.com/character/view/TerrorZone",
      undefined,
      "server1"
    );

    expect(result.isOnline).toBe(false);
    expect(result.level).toBe(100);
  });

  it("should parse OTDBO style character information", async () => {
    const mockHtml = `
      <html>
        <body>
          <table>
            <tr>
              <td>Name:</td>
              <td>Kinho Neverlose <span>(Online)</span></td>
            </tr>
            <tr>
              <td>Vocation:</td>
              <td>Hitto Reborn</td>
            </tr>
            <tr>
              <td>Level:</td>
              <td>389</td>
            </tr>
          </table>
        </body>
      </html>
    `;

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: mockHtml,
    });

    const result = await getCharacterStatus(
      "Kinho Neverlose",
      "https://www.otdbo.com.br/?subtopic=characters&name=Kinho+Neverlose",
      undefined,
      "otdbo"
    );

    expect(result.level).toBe(389);
    expect(result.isOnline).toBe(true);
  });

  it("should extract level from different formats", async () => {
    const testCases = [
      { html: "<td>Level: 200</td>", expected: 200 },
      { html: "<td>Nível: 300</td>", expected: 300 },
      { html: "<div>Level 400</div>", expected: 400 },
      { html: "<span>Nível 500</span>", expected: 500 },
    ];

    for (const testCase of testCases) {
      mockedAxiosGet.mockResolvedValueOnce({
        status: 200,
        data: `<html><body>${testCase.html}</body></html>`,
      });

      const result = await getCharacterStatus(
        "AAAz",
        "https://example.com/character/view/AAAz",
        undefined,
        "server1"
      );

      expect(result.level).toBe(testCase.expected);
    }
  });

  it("should return null for level when not found", async () => {
    const mockHtml = `
      <html>
        <body>
          <div>Personagem sem nível visível</div>
        </body>
      </html>
    `;

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: mockHtml,
    });

    const result = await getCharacterStatus(
      "AAAzao",
      "https://example.com/character/view/AAAzao",
      undefined,
      "server1"
    );

    expect(result.level).toBeNull();
  });

  it("should extract death information when available", async () => {
    const mockHtml = `
      <html>
        <body>
          <div class="bar">Últimas mortes</div>
          <table>
            <tr>
              <td>2024-01-15 10:30:00</td>
              <td>
                Eliminado no nível 99 por 
                <a href="/character/Monster1">Monster1</a> e 
                <a href="/character/Monster2">Monster2</a>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: mockHtml,
    });

    const result = await getCharacterStatus(
      "AAAzin",
      "https://example.com/character/view/AAAzin",
      undefined,
      "server1"
    );

    expect(result.lastDeath).not.toBeNull();
    expect(result.lastDeath?.level).toBe(99);
    expect(result.lastDeath?.killers).toContain("Monster1");
    expect(result.lastDeath?.killers).toContain("Monster2");
  });

  it("should extract death information in english format", async () => {
    const mockHtml = `
      <html>
        <body>
          <div class="TableContainer">
            <div class="CaptionInnerContainer">
              <div class="Text">Deaths</div>
            </div>
            <table>
              <tr>
                <td>2 Mar 2026, 17:18</td>
                <td>
                  Killed at level 298 by
                  <a href="?subtopic=characters&name=Dead+Monster">Dead Monster</a>.
                </td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: mockHtml,
    });

    const result = await getCharacterStatus(
      "Kinho Neverlose",
      "https://www.otdbo.com.br/?subtopic=characters&name=Kinho+Neverlose",
      undefined,
      "otdbo"
    );

    expect(result.lastDeath).not.toBeNull();
    expect(result.lastDeath?.level).toBe(298);
    expect(result.lastDeath?.killers).toContain("Dead Monster");
  });

  it("should use custom headers when provided", async () => {
    const customHeaders = {
      cookie: "cf_clearance=test123",
      "user-agent": "CustomBot/1.0",
    };

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: "<html><body><p>Level: 100</p></body></html>",
    });

    await getCharacterStatus(
      "AAAzinho",
      "https://example.com/character/view/AAAzinho",
      customHeaders,
      "server1"
    );

    expect(mockedAxiosGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining(customHeaders),
      })
    );
  });

  it("should try multiple header strategies on failure", async () => {
    mockedAxiosGet
      .mockRejectedValueOnce({
        response: { status: 403 },
        isAxiosError: true,
      })
      .mockResolvedValueOnce({
        status: 200,
        data: "<html><body><p>Level: 100</p></body></html>",
      });

    const result = await getCharacterStatus(
      "TestChar",
      "https://server1.example.com/character/TestChar",
      undefined,
      "server1"
    );

    expect(result.level).toBe(100);
    expect(mockedAxiosGet).toHaveBeenCalledTimes(2);
  });

  it("should throw error when all strategies fail", async () => {
    mockedAxiosGet.mockRejectedValue({
      response: { status: 403 },
      isAxiosError: true,
    });

    await expect(
      getCharacterStatus(
        "AADanzou",
        "https://example.com/character/view/AADanzou",
        undefined,
        "server1"
      )
    ).rejects.toThrow();
  });

  it("should handle request timeout", async () => {
    mockedAxiosGet.mockRejectedValue({
      code: "ECONNABORTED",
      message: "timeout",
      isAxiosError: true,
    });

    await expect(
      getCharacterStatus(
        "AADanzou",
        "https://example.com/character/view/AADanzou",
        undefined,
        "server1"
      )
    ).rejects.toThrow();
  });
});

describe("Scraper - getGuildMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should extract guild members with query_params structure", async () => {
    const mockHtml = `
      <html>
        <body>
          <a href="?subtopic=characters&name=SrGUSTAVO">SrGUSTAVO</a>
          <a href="?subtopic=characters&name=TerrorZone">TerrorZone</a>
          <a href="?subtopic=characters&name=AAAz">AAAz</a>
        </body>
      </html>
    `;

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: mockHtml,
    });

    const members = await getGuildMembers(
      "https://example.com/guilds/view/1"
    );

    expect(members).toHaveLength(3);
    expect(members.map((m) => m.name)).toContain("SrGUSTAVO");
    expect(members.map((m) => m.name)).toContain("TerrorZone");
    expect(members.map((m) => m.name)).toContain("AAAz");
  });

  it("should extract guild members when href query params are uppercase", async () => {
    const mockHtml = `
      <html>
        <body>
          <a HREF="?SUBTOPIC=characters&NAME=SrGUSTAVO">SrGUSTAVO</a>
          <a HREF="?SUBTOPIC=characters&NAME=TerrorZone">TerrorZone</a>
        </body>
      </html>
    `;

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: mockHtml,
    });

    const members = await getGuildMembers(
      "https://www.otdbo.com.br/?subtopic=guilds&action=view&GuildName=Ta+DEBOREST"
    );

    expect(members).toHaveLength(2);
    expect(members.map((m) => m.name)).toContain("SrGUSTAVO");
    expect(members.map((m) => m.name)).toContain("TerrorZone");
  });

  it("should extract guild members and invited characters from OTDBO sections", async () => {
    const mockHtml = `
      <html>
        <body>
          <div>
            Criador da Guild
            <a href="?subtopic=characters&name=HyoTeN+StyLe+EdiTeD">HyoTeN StyLe EdiTeD</a>
          </div>
          <div class="TableContainer">
            <div class="CaptionInnerContainer">
              <div class="Text">Guild Members</div>
            </div>
            <table class="TableContent">
              <tr class="LabelH">
                <td>Rank</td>
                <td>Name and Title</td>
                <td>Vocation</td>
                <td>Level</td>
              </tr>
              <tr>
                <td>Leader</td>
                <td><a href="?subtopic=characters&name=HyoTeN+StyLe+EdiTeD">HyoTeN StyLe EdiTeD</a></td>
                <td>Tapion Reborn</td>
                <td>420</td>
              </tr>
              <tr>
                <td>Member</td>
                <td><a href="?subtopic=characters&name=Kinho+Neverlose">Kinho Neverlose</a></td>
                <td>Hitto Reborn</td>
                <td>389</td>
              </tr>
            </table>
          </div>
          <div class="TableContainer">
            <div class="CaptionInnerContainer">
              <div class="Text">Invited Characters</div>
            </div>
            <table>
              <tr>
                <td><a href="?subtopic=characters&name=Epsteinsszpdiddy">Epsteinsszpdiddy</a></td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: mockHtml,
    });

    const members = await getGuildMembers(
      "https://www.otdbo.com.br/?subtopic=guilds&action=view&GuildName=Ta+DEBOREST"
    );

    expect(members.map((m) => m.name)).toEqual([
      "HyoTeN StyLe EdiTeD",
      "Kinho Neverlose",
      "Epsteinsszpdiddy",
    ]);
  });

  it("should extract guild members from route style ?characters/Name", async () => {
    const mockHtml = `
      <html>
        <body>
          <div class="TableContainer">
            <div class="CaptionInnerContainer">
              <div class="Text">Guild Members</div>
            </div>
            <table>
              <tr>
                <td><a href="?characters/Barao+Blue">Barao Blue</a></td>
              </tr>
              <tr>
                <td><a href="?characters/Kyro+K">Kyro K</a></td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: mockHtml,
    });

    const members = await getGuildMembers("https://dbogame.com.br/?guilds/PRIQUITAO+DA+GORETE");

    expect(members.map((m) => m.name)).toEqual(["Barao Blue", "Kyro K"]);
  });

  it("should extract guild members from /characters?name=Name links", async () => {
    const mockHtml = `
      <html>
        <body>
          <table>
            <tbody>
              <tr>
                <td><a href="/characters?name=Pepeco">Pepeco</a></td>
              </tr>
              <tr>
                <td><a href="/characters?name=Lord+Syan">Lord Syan</a></td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: mockHtml,
    });

    const members = await getGuildMembers("https://rubinot.com.br/guilds/Anathema");

    expect(members.map((m) => m.name)).toEqual(["Pepeco", "Lord Syan"]);
  });

  it("should include invited section when title is localized", async () => {
    const mockHtml = `
      <html>
        <body>
          <div class="TableContainer">
            <div class="CaptionInnerContainer">
              <div class="Text">Membros</div>
            </div>
            <table>
              <tr>
                <td><a href="?subtopic=characters&name=Kinho+Neverlose">Kinho Neverlose</a></td>
              </tr>
            </table>
          </div>
          <div class="TableContainer">
            <div class="CaptionInnerContainer">
              <div class="Text">Convidados</div>
            </div>
            <table>
              <tr>
                <td><a href="?subtopic=characters&name=Azulino+Maloqueiro">Azulino Maloqueiro</a></td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: mockHtml,
    });

    const members = await getGuildMembers(
      "https://www.otdbo.com.br/?subtopic=guilds&action=view&GuildName=Ta+DEBOREST"
    );

    expect(members.map((m) => m.name)).toEqual(["Kinho Neverlose", "Azulino Maloqueiro"]);
  });

  it("should extract guild members with characters_path structure", async () => {
    const mockHtml = `
      <html>
        <body>
          <table>
            <tbody>
              <tr>
                <td><a href="/characters/SrGUSTAVO">SrGUSTAVO</a></td>
              </tr>
              <tr>
                <td><a href="/characters/TerrorZone">TerrorZone</a></td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: mockHtml,
    });

    const members = await getGuildMembers(
      "https://example.com/guilds/view/1"
    );

    expect(members.length).toBeGreaterThan(0);
    expect(members.some((m) => m.name === "SrGUSTAVO")).toBe(true);
  });

  it("should normalize relative URLs to absolute", async () => {
    const mockHtml = `
      <html>
        <body>
          <a href="/characters/Player1">Player1</a>
        </body>
      </html>
    `;

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: mockHtml,
    });

    const members = await getGuildMembers(
      "https://example.com/guilds/view/1"
    );

    expect(members[0]?.url).toContain("https://example.com");
    expect(members[0]?.url).toContain("Player1");
  });

  it("should remove duplicate members", async () => {
    const mockHtml = `
      <html>
        <body>
          <a href="/characters/SrGUSTAVO">SrGUSTAVO</a>
          <a href="/characters/SrGUSTAVO">SrGUSTAVO</a>
          <a href="/characters/TerrorZone">TerrorZone</a>
        </body>
      </html>
    `;

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: mockHtml,
    });

    const members = await getGuildMembers(
      "https://example.com/guilds/view/1"
    );

    const uniqueNames = new Set(members.map((m) => m.name));
    expect(uniqueNames.size).toBe(members.length);
  });

  it("should filter guild headers (Leader, Vice-Leader, Member)", async () => {
    const mockHtml = `
      <html>
        <body>
          <div>Leader</div>
          <a href="/characters/SrGUSTAVO">SrGUSTAVO</a>
          <div>Vice-Leader</div>
          <a href="/characters/TerrorZone">TerrorZone</a>
          <div>Member</div>
          <a href="/characters/AAAz">AAAz</a>
        </body>
      </html>
    `;

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: mockHtml,
    });

    const members = await getGuildMembers(
      "https://example.com/guilds/view/1"
    );

    expect(members.every((m) => m.name !== "Leader")).toBe(true);
  });

  it("should use custom headers when provided", async () => {
    const customHeaders = {
      cookie: "cf_clearance=test123",
    };

    mockedAxiosGet.mockResolvedValueOnce({
      status: 200,
      data: "<html><body></body></html>",
    });

    await getGuildMembers("https://server1.example.com/guilds/test", customHeaders);

    expect(mockedAxiosGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining(customHeaders),
      })
    );
  });

  it("should try multiple header strategies on failure", async () => {
    mockedAxiosGet
      .mockRejectedValueOnce({
        response: { status: 403 },
        isAxiosError: true,
      })
      .mockResolvedValueOnce({
        status: 200,
        data: `
          <html>
            <body>
              <div class="content">
                <p>Guild Members</p>
                <a href="/characters/Player1">Player1</a>
                <a href="/characters/Player2">Player2</a>
              </div>
            </body>
          </html>
        `,
      });

    const members = await getGuildMembers(
      "https://example.com/guilds/view/1"
    );

    expect(members.length).toBeGreaterThan(0);
    expect(mockedAxiosGet).toHaveBeenCalledTimes(2);
  });
});

describe("Scraper - getAllDeaths", () => {
  it("should extract all deaths from a page", () => {
    const mockHtml = `
      <html>
        <body>
          <div class="bar">Últimas mortes</div>
          <table>
            <tr>
              <td>2024-01-15 10:30:00</td>
              <td>
                Eliminado no nível 99 por 
                <a href="/character/Monster1">Monster1</a>
              </td>
            </tr>
            <tr>
              <td>2024-01-14 15:20:00</td>
              <td>
                Eliminado no nível 98 por 
                <a href="/character/Monster2">Monster2</a>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const deaths = getAllDeaths(mockHtml);

    expect(deaths).toHaveLength(2);
    expect(deaths[0]?.level).toBe(99);
    expect(deaths[0]?.killers).toContain("Monster1");
    expect(deaths[1]?.level).toBe(98);
    expect(deaths[1]?.killers).toContain("Monster2");
  });

  it("should return empty array when there are no deaths", () => {
    const mockHtml = `
      <html>
        <body>
          <div>Nenhuma morte registrada</div>
        </body>
      </html>
    `;

    const deaths = getAllDeaths(mockHtml);

    expect(deaths).toHaveLength(0);
  });

  it("should limit to 10 deaths (MAX_DEATHS)", () => {
    const mockHtml = `
      <html>
        <body>
          <div class="bar">Últimas mortes</div>
          <table>
            ${Array.from(
              { length: 15 },
              (_, i) => `
              <tr>
                <td>2024-01-15 ${i}:00:00</td>
                <td>
                  Eliminado no nível ${100 - i} por 
                  <a href="/character/Monster${i}">Monster${i}</a>
                </td>
              </tr>
            `
            ).join("")}
          </table>
        </body>
      </html>
    `;

    const deaths = getAllDeaths(mockHtml);

    expect(deaths.length).toBeLessThanOrEqual(10);
  });

  it("should validate required death fields", () => {
    const mockHtml = `
      <html>
        <body>
          <div class="bar">Últimas mortes</div>
          <table>
            <tr>
              <td>2024-01-15 10:30:00</td>
              <td>Texto inválido sem 'Eliminado'</td>
            </tr>
            <tr>
              <td>2024-01-15 10:30:00</td>
              <td>
                Eliminado no nível 99 por 
                <a href="/character/Monster1">Monster1</a>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const deaths = getAllDeaths(mockHtml);

    expect(deaths).toHaveLength(1);
    expect(deaths[0]?.level).toBe(99);
  });
});
