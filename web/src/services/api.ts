import type {
  ServerConfig,
  CharacterDetails,
  AddServerPayload,
  UpdateServerPayload,
  InspectCharacterParams,
  DiscoverGuildsResponse,
  SystemStatsResponse,
  ActivityEvent,
} from "@types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api` : "/api";
const FETCH_DEFAULTS: RequestInit = { credentials: "include" };

export const getProxiedImageUrl = (rawUrl: string): string =>
  `${API_BASE}/proxy-image?url=${encodeURIComponent(rawUrl)}`;

const safeParseJson = async (res: Response): Promise<any> => {
  try {
    return await res.json();
  } catch (err) {
    console.warn("⚠️ Resposta HTTP não contém JSON válido:", err);
    return {};
  }
};

export class LoginRequiredApiError extends Error {
  domain: string;
  loginUrl: string;

  constructor(message: string, domain: string, loginUrl: string) {
    super(message);
    this.name = "LoginRequiredApiError";
    this.domain = domain;
    this.loginUrl = loginUrl;
  }
}

export const api = {
  async getServers(): Promise<ServerConfig[]> {
    const res = await fetch(`${API_BASE}/servers`, FETCH_DEFAULTS);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async getStats(): Promise<SystemStatsResponse> {
    const res = await fetch(`${API_BASE}/stats`, FETCH_DEFAULTS);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async getEvents(limit = 50): Promise<ActivityEvent[]> {
    const res = await fetch(`${API_BASE}/events?limit=${limit}`, FETCH_DEFAULTS);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async discoverGuilds(url: string): Promise<DiscoverGuildsResponse> {
    const res = await fetch(`${API_BASE}/discover`, {
      ...FETCH_DEFAULTS,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const data = await safeParseJson(res);
      if (data.code === "LOGIN_REQUIRED") {
        throw new LoginRequiredApiError(data.error || "Login necessário.", data.domain, data.loginUrl);
      }
      throw new Error(data.error || "Falha ao efetuar scraping na URL informada");
    }
    return await res.json();
  },

  async addServer(payload: AddServerPayload): Promise<ServerConfig> {
    const res = await fetch(`${API_BASE}/servers`, {
      ...FETCH_DEFAULTS,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await safeParseJson(res);
      if (data.code === "LOGIN_REQUIRED") {
        throw new LoginRequiredApiError(data.error || "Login necessário.", data.domain, data.loginUrl);
      }
      throw new Error(data.error || "Erro ao adicionar servidor");
    }
    return await res.json();
  },

  async loginToSite(loginUrl: string, username: string, password: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/site-auth/login`, {
      ...FETCH_DEFAULTS,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginUrl, username, password }),
    });
    if (!res.ok) {
      const data = await safeParseJson(res);
      throw new Error(data.error || "Erro ao efetuar login no site");
    }
    return await res.json();
  },

  async updateServer(serverId: string, payload: UpdateServerPayload): Promise<ServerConfig> {
    const res = await fetch(`${API_BASE}/servers/${serverId}`, {
      ...FETCH_DEFAULTS,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await safeParseJson(res);
      throw new Error(data.error || "Erro ao atualizar servidor");
    }
    return await res.json();
  },

  async syncServer(serverId: string): Promise<ServerConfig> {
    const res = await fetch(`${API_BASE}/servers/${serverId}/sync`, {
      ...FETCH_DEFAULTS,
      method: "POST",
    });
    if (!res.ok) {
      const data = await safeParseJson(res);
      throw new Error(data.error || "Erro ao sincronizar servidor");
    }
    return await res.json();
  },

  async testWebhook(serverId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/servers/${serverId}/test-webhook`, {
      ...FETCH_DEFAULTS,
      method: "POST",
    });
    if (!res.ok) {
      const data = await safeParseJson(res);
      throw new Error(data.error || "Erro ao testar webhook");
    }
  },

  async testWebhookUrl(webhookUrl: string): Promise<void> {
    const res = await fetch(`${API_BASE}/test-webhook`, {
      ...FETCH_DEFAULTS,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookUrl }),
    });
    if (!res.ok) {
      const data = await safeParseJson(res);
      throw new Error(data.error || "Erro ao testar webhook");
    }
  },

  async deleteServer(serverId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/servers/${serverId}`, {
      ...FETCH_DEFAULTS,
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await safeParseJson(res);
      throw new Error(data.error || "Erro ao remover servidor");
    }
    return true;
  },

  async inspectCharacter(params: InspectCharacterParams): Promise<CharacterDetails> {
    const res = await fetch(`${API_BASE}/character/inspect`, {
      ...FETCH_DEFAULTS,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const data = await safeParseJson(res);
      throw new Error(data.error || "Erro ao inspecionar personagem no servidor");
    }
    return await res.json();
  },
};
