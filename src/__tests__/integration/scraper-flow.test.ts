import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { getCharacterStatus, getGuildMembers } from "@infrastructure/scraping/scraper";

vi.mock("axios");
const mockedAxiosGet = vi.mocked(axios.get);

vi.mock("@infrastructure/scraping/playwrightManager", () => ({
  playwrightManager: null,
}));

describe("Scraper Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCharacterStatus - Axios Flow", () => {
    it("should use axios for server1 (not playwright)", async () => {
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

      expect(mockedAxiosGet).toHaveBeenCalled();
    });

    it("should use axios for server2 (not playwright)", async () => {
      const mockHtml = `
        <html>
          <body>
            <div>
              <p>Level: 100</p>
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
        "TerrorZone",
        "https://example.com/character/view/TerrorZone",
        undefined,
        "server2"
      );

      expect(result.level).toBe(100);
      expect(mockedAxiosGet).toHaveBeenCalled();
    });

    it("should try multiple header strategies on failure", async () => {
      mockedAxiosGet
        .mockRejectedValueOnce({
          response: { status: 403 },
          isAxiosError: true,
        })
        .mockResolvedValueOnce({
          status: 200,
          data: "<html><body><p>Level: 150</p></body></html>",
        });

      const result = await getCharacterStatus(
        "SrGUSTAVO",
        "https://example.com/character/view/SrGUSTAVO",
        undefined,
        "server1"
      );

      expect(result.level).toBe(150);
      expect(mockedAxiosGet).toHaveBeenCalledTimes(2);
    });
  });

  describe("getGuildMembers - Axios Flow", () => {
    it("should extract guild members using axios", async () => {
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
      expect(mockedAxiosGet).toHaveBeenCalled();
    });
  });
});
