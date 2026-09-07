import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { StatCards } from "./components/StatCards";
import { ServerCard, ServerCardSkeleton } from "./components/ServerCard";
import { ServerConfigPanel } from "./components/ServerConfigPanel";
import { LiveFeed } from "./components/LiveFeed";
import { CharacterSearch } from "./components/CharacterSearch";
import { GlobalSettingsView } from "./components/GlobalSettingsView";
import { ServerModal } from "./components/ServerModal";
import type { ServerConfig, ActivityEvent, SystemStats } from "./types";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "./services/api";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "servers" | "characters" | "feed" | "settings">("dashboard");
  const [searchTerm, setSearchTerm] = useState("");

  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    activeWorkers: 0,
    monitoredGuilds: 0,
    totalCharacters: 0,
    onlineCharacters: 0,
    notifications24h: 0,
    cloudflareBypasses: 0,
  });
  const [isApiOffline, setIsApiOffline] = useState(false);
  // True until the first loadRealData/loadEvents call resolves.
  const [isLoadingServers, setIsLoadingServers] = useState(true);
  // Not yet consumed as a prop — LiveFeed doesn't accept isLoading until that task lands;
  // this line only satisfies noUnusedLocals in the meantime.
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  void isLoadingEvents;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [testingScrapeId, setTestingScrapeId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load real server configurations from backend API — this is the single source
  // of truth for the dashboard; it never falls back to mock data, so an empty or
  // failed response must be reflected as such instead of showing fake servers/stats.
  const loadRealData = async (): Promise<boolean> => {
    try {
      const [realServers, realStats] = await Promise.all([api.getServers(), api.getStats()]);
      setServers(realServers);
      setStats({
        activeWorkers: realStats.activeServers,
        monitoredGuilds: realStats.totalServers,
        totalCharacters: realStats.monitoredCharacters,
        onlineCharacters: realStats.onlineCharacters,
        notifications24h: 0,
        cloudflareBypasses: realServers.filter((s) => s.hasCloudflare).length,
      });
      setIsApiOffline(false);
      return true;
    } catch (err: unknown) {
      console.warn("Failed to load real stats:", err);
      setIsApiOffline(true);
      return false;
    } finally {
      setIsLoadingServers(false);
    }
  };

  const loadEvents = async () => {
    try {
      const realEvents = await api.getEvents();
      setEvents(realEvents);
    } catch (err: unknown) {
      console.warn("Failed to load activity events:", err);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadRealData();
    loadEvents();

    const eventsPollId = window.setInterval(loadEvents, 20000);
    return () => window.clearInterval(eventsPollId);
  }, []);

  // Toggle server active status
  const handleToggleStatus = async (serverId: string) => {
    const target = servers.find((s) => s.serverId === serverId);
    if (!target) return;

    const newStatus = !(target.guild.enabled !== false);
    setServers((prev) =>
      prev.map((s) => (s.serverId === serverId ? { ...s, guild: { ...s.guild, enabled: newStatus } } : s))
    );

    try {
      await api.updateServer(serverId, { enabled: newStatus });
      showToast(`Servidor ${target.serverName} foi ${newStatus ? "ativado" : "pausado"}.`, "info");
    } catch (err: unknown) {
      console.warn("Failed to update server status on API:", err);
      setServers((prev) =>
        prev.map((s) => (s.serverId === serverId ? { ...s, guild: { ...s.guild, enabled: !newStatus } } : s))
      );
      showToast(`Falha ao atualizar ${target.serverName} no backend. Nada foi alterado.`, "error");
    }
  };

  // Test scraping with live backend sync
  const handleTestScrape = async (serverId: string) => {
    const targetServer = servers.find((s) => s.serverId === serverId);
    if (!targetServer) return;

    setTestingScrapeId(serverId);

    try {
      const updatedConfig = await api.syncServer(serverId);
      setTestingScrapeId(null);
      setServers((prev) => prev.map((s) => (s.serverId === serverId ? updatedConfig : s)));
      showToast(`✅ Scraping concluído em ${targetServer.serverName}! Membros e estáticas atualizadas com sucesso.`, "success");

      const newEvent: ActivityEvent = {
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        serverId: targetServer.serverId,
        serverName: targetServer.serverName,
        type: "guild_sync",
        details: `Varredura manual executada (${Object.keys(updatedConfig.characters || {}).length} membros)`,
        webhookSent: false,
      };
      setEvents((prev) => [newEvent, ...prev]);
    } catch (err: unknown) {
      setTestingScrapeId(null);
      const message = err instanceof Error ? err.message : "Erro desconhecido ao sincronizar";
      showToast(`❌ Falha ao testar ${targetServer.serverName}: ${message}`, "error");
      // The backend may have already flipped isWorking to false before throwing —
      // reload so the card reflects that instead of showing the stale prior status.
      await loadRealData();
    }
  };

  // Refresh all servers
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    const [success] = await Promise.all([loadRealData(), loadEvents()]);
    setIsRefreshing(false);
    if (success) {
      showToast("Dados atualizados a partir do backend.", "success");
    } else {
      showToast("Falha ao atualizar: API indisponível.", "error");
    }
  };

  // Modal open for create
  const handleOpenAddModal = () => {
    setEditingServer(null);
    setIsModalOpen(true);
  };

  // Modal open for edit
  const handleOpenEditModal = (server: ServerConfig) => {
    setEditingServer(server);
    setIsModalOpen(true);
  };

  // Delete server
  const handleDeleteServer = async (serverId: string) => {
    const target = servers.find((s) => s.serverId === serverId);
    setServers((prev) => prev.filter((s) => s.serverId !== serverId));
    try {
      await api.deleteServer(serverId);
      showToast("Servidor removido do backend com sucesso.", "info");
    } catch (err: unknown) {
      console.warn("Failed to delete server on API:", err);
      if (target) {
        setServers((prev) => [...prev, target]);
      }
      showToast("Falha ao remover o servidor no backend. Ele continua cadastrado.", "error");
    }
  };

  // Save server from modal to backend
  const handleSaveServer = async (serverData: Partial<ServerConfig>) => {
    if (editingServer) {
      try {
        const updated = await api.updateServer(editingServer.serverId, serverData);
        setServers((prev) => prev.map((s) => (s.serverId === editingServer.serverId ? updated : s)));
        showToast(`Configurações de ${serverData.serverName} salvas no backend.`, "success");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro desconhecido ao salvar";
        showToast(`❌ Falha ao salvar ${serverData.serverName}: ${message}`, "error");
      }
    } else {
      try {
        const newServer = await api.addServer({
          url: serverData.guild?.url || "",
          name: serverData.serverName,
          logoUrl: serverData.guild?.logoUrl,
          webhookUrl: serverData.guild?.webhookUrl,
          kills: serverData.guild?.kills,
          world: serverData.guild?.world,
        });
        setServers((prev) => [newServer, ...prev]);
        showToast(`Novo servidor ${newServer.serverName} cadastrado no backend!`, "success");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro ao adicionar servidor";
        showToast(message, "error");
      }
    }
  };

  // Filtered servers based on topbar search
  const filteredServers = servers.filter((s) =>
    !searchTerm ||
    s.serverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.serverId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in bg-slate-900 border border-white/15 backdrop-blur-xl px-4 py-3 rounded-lg text-white font-medium text-xs shadow-2xl flex items-center gap-2">
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastMessage.type === 'info' && <AlertCircle className="w-4 h-4 text-blue-400" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* API Offline Banner — the dashboard never falls back to fake data, so a real backend outage must be visible */}
      {isApiOffline && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in bg-rose-950/90 border border-rose-500/40 backdrop-blur-xl px-4 py-2.5 rounded-lg text-rose-200 font-medium text-xs shadow-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>Não foi possível conectar à API. Os dados exibidos podem estar desatualizados.</span>
        </div>
      )}

      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        serverCount={servers.length}
      />

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header */}
        <TopBar
          activeTab={activeTab}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onAddServer={handleOpenAddModal}
          onRefreshAll={handleRefreshAll}
          isRefreshing={isRefreshing}
        />

        {/* Dynamic Views Rendering */}
        <main className="p-6 flex-1 space-y-6">
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fade-in">
              {/* KPI Stats */}
              <StatCards
                stats={{
                  ...stats,
                  activeWorkers: servers.filter((s) => s.guild.enabled !== false).length,
                  monitoredGuilds: servers.length,
                }}
                isLoading={isLoadingServers}
              />

              {/* Servers Grid */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Servidores Open Tibia Monitored ({filteredServers.length})
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Gerenciamento individual de guildas e parâmetros de scraping
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {isLoadingServers
                    ? Array.from({ length: 3 }).map((_, i) => <ServerCardSkeleton key={i} />)
                    : filteredServers.map((server) => (
                        <ServerCard
                          key={server.serverId}
                          server={server}
                          onToggleStatus={handleToggleStatus}
                          onTestScrape={handleTestScrape}
                          onEdit={handleOpenEditModal}
                          onDelete={handleDeleteServer}
                          isTestingScrape={testingScrapeId === server.serverId}
                        />
                      ))}
                </div>
              </section>

              {/* Character Inspector */}
              <CharacterSearch servers={servers} />

              {/* Live Activity Feed */}
              <LiveFeed events={events} />
            </div>
          )}

          {activeTab === "servers" && (
            <div className="space-y-6 animate-fade-in">
              {/* Health Monitoring & Config Panel */}
              <ServerConfigPanel
                servers={servers}
                isLoading={isLoadingServers}
                onToggleStatus={handleToggleStatus}
                onTestScrape={handleTestScrape}
                onEditServer={handleOpenEditModal}
                onDeleteServer={handleDeleteServer}
                onAddServer={handleOpenAddModal}
                testingServerId={testingScrapeId}
              />
            </div>
          )}

          {activeTab === "characters" && (
            <div className="space-y-6 animate-fade-in">
              <CharacterSearch servers={servers} />
            </div>
          )}

          {activeTab === "feed" && (
            <div className="space-y-6 animate-fade-in">
              <LiveFeed events={events} />
            </div>
          )}

          {activeTab === "settings" && (
            <GlobalSettingsView />
          )}
        </main>
      </div>

      {/* Server Create/Edit Modal */}
      <ServerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveServer}
        initialServer={editingServer}
      />
    </div>
  );
}
