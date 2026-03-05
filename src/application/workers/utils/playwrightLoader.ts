type PlaywrightManagerLike = {
  closeBrowser: (serverId: string) => Promise<void>;
};

let playwrightManager: PlaywrightManagerLike | false | null = null;

export const loadPlaywrightManager = async (): Promise<PlaywrightManagerLike | null> => {
  if (playwrightManager !== null) {
    return playwrightManager || null;
  }

  try {
    const playwrightModule = await import("@infrastructure/scraping/playwrightManager");
    playwrightManager = playwrightModule.playwrightManager as PlaywrightManagerLike;
    return playwrightManager || null;
  } catch {
    playwrightManager = false;
    return null;
  }
};
