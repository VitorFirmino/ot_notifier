import { useState } from "react";
import { useLocation, useNavigate, matchPath } from "react-router-dom";
import { Sidebar } from "@components/Sidebar";
import { TopBar } from "@components/TopBar";
import { StatCards } from "@components/StatCards";
import { ServerCard, ServerCardSkeleton } from "@components/ServerCard";
import { ServerConfigPanel } from "@components/ServerConfigPanel";
import { ServerDetailView } from "@components/ServerDetailView";
import { LiveFeed } from "@components/LiveFeed";
import { CharacterSearch } from "@components/CharacterSearch";
import { GlobalSettingsView } from "@components/GlobalSettingsView";
import { ServerModal } from "@components/ServerModal";
import { ConfirmDeleteServerDialog } from "@components/ConfirmDeleteServerDialog";
import type { ServerConfig, ActivityEvent, SystemStats } from "@types";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useServers } from "@hooks/useServers";
import { useEvents, EVENTS_QUERY_KEY } from "@hooks/useEvents";
import {
  useToggleServerStatus,
  useSyncServer,
  useTestWebhook,
  useDeleteServer,
  useAddServer,
  useUpdateServer,
} from "@hooks/useServerMutations";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@lib/authClient";
import { LoginView } from "@components/LoginView";

type TabId = "dashboard" | "servers" | "characters" | "feed" | "settings";

const TAB_PATHS: Record<TabId, string> = {
  dashboard: "/",
  servers: "/servers",
  characters: "/characters",
  feed: "/feed",
  settings: "/settings",
};

const getTabFromPath = (pathname: string): TabId => {
  const match = (Object.entries(TAB_PATHS) as [TabId, string][]).find(([, path]) => path === pathname);
  if (match) return match[0];
  if (pathname.startsWith("/servers/")) return "servers";
  return "dashboard";
};

const computeStats = (servers: ServerConfig[], events: ActivityEvent[]): SystemStats => {
  const active = servers.filter((server) => server.guild.enabled !== false && server.isWorking !== false);
  const totalCharacters = active.reduce((sum, server) => sum + Object.keys(server.characters || {}).length, 0);
  const onlineCharacters = active.reduce(
    (sum, server) => sum + Object.values(server.characters || {}).filter((character) => character.isOnline === true).length,
    0
  );

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const notifications24h = events.filter(
    (evt) => evt.webhookSent && new Date(evt.timestamp).getTime() >= oneDayAgo
  ).length;

  return {
    activeWorkers: active.length,
    monitoredGuilds: servers.length,
    totalCharacters,
    onlineCharacters,
    notifications24h,
    cloudflareBypasses: servers.filter((server) => server.hasCloudflare).length,
  };
};

export default function App() {
  const { data: session, isPending: isSessionLoading } = authClient.useSession();

  if (isSessionLoading) {
    return null;
  }

  if (!session) {
    return <LoginView />;
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getTabFromPath(location.pathname);
  const handleTabChange = (tab: TabId) => navigate(TAB_PATHS[tab]);
  const detailServerId = matchPath("/servers/:serverId", location.pathname)?.params.serverId;

  const [searchTerm, setSearchTerm] = useState("");

  const queryClient = useQueryClient();
  const serversQuery = useServers();
  const eventsQuery = useEvents();

  const servers = serversQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const stats = computeStats(servers, events);
  const isApiOffline = serversQuery.isError;
  const isLoadingServers = serversQuery.isLoading;
  const isLoadingEvents = eventsQuery.isLoading;

  const toggleStatusMutation = useToggleServerStatus();
  const syncMutation = useSyncServer();
  const testWebhookMutation = useTestWebhook();
  const deleteMutation = useDeleteServer();
  const addServerMutation = useAddServer();
  const updateServerMutation = useUpdateServer();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleStatus = (serverId: string) => {
    const target = servers.find((server) => server.serverId === serverId);
    if (!target) return;

    const newStatus = !(target.guild.enabled !== false);
    toggleStatusMutation.mutate(
      { serverId, enabled: newStatus },
      {
        onSuccess: () =>
          showToast(`Servidor ${target.serverName} foi ${newStatus ? "ativado" : "pausado"}.`, "info"),
        onError: () =>
          showToast(`Falha ao atualizar ${target.serverName} no backend. Nada foi alterado.`, "error"),
      }
    );
  };

  const handleTestScrape = (serverId: string) => {
    const targetServer = servers.find((server) => server.serverId === serverId);
    if (!targetServer) return;

    syncMutation.mutate(serverId, {
      onSuccess: (updatedConfig) => {
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
        queryClient.setQueryData<ActivityEvent[]>(EVENTS_QUERY_KEY, (old) => [newEvent, ...(old ?? [])]);
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : "Erro desconhecido ao sincronizar";
        showToast(`❌ Falha ao testar ${targetServer.serverName}: ${message}`, "error");
      },
    });
  };
  const testingScrapeId = syncMutation.isPending ? (syncMutation.variables ?? null) : null;

  const handleTestWebhook = (serverId: string) => {
    const targetServer = servers.find((server) => server.serverId === serverId);
    if (!targetServer) return;

    testWebhookMutation.mutate(serverId, {
      onSuccess: () => showToast(`✅ Mensagem de teste enviada! Confira o canal Discord de ${targetServer.serverName}.`, "success"),
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : "Erro desconhecido ao testar webhook";
        showToast(`❌ Falha ao testar webhook de ${targetServer.serverName}: ${message}`, "error");
      },
    });
  };
  const testingWebhookId = testWebhookMutation.isPending ? (testWebhookMutation.variables ?? null) : null;

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    const [serversResult, eventsResult] = await Promise.allSettled([serversQuery.refetch(), eventsQuery.refetch()]);
    setIsRefreshing(false);
    const success = serversResult.status === "fulfilled" && eventsResult.status === "fulfilled";
    if (success) {
      showToast("Dados atualizados a partir do backend.", "success");
    } else {
      showToast("Falha ao atualizar: API indisponível.", "error");
    }
  };

  const handleOpenAddModal = () => {
    setEditingServer(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (server: ServerConfig) => {
    setEditingServer(server);
    setIsModalOpen(true);
  };

  const handleRequestDeleteServer = (serverId: string) => {
    setDeleteTargetId(serverId);
  };

  const handleConfirmDeleteServer = (serverId: string) => {
    setDeleteTargetId(null);
    deleteMutation.mutate(serverId, {
      onSuccess: () => {
        showToast("Servidor removido do backend com sucesso.", "info");
        if (detailServerId === serverId) navigate("/servers");
      },
      onError: () => showToast("Falha ao remover o servidor no backend. Ele continua cadastrado.", "error"),
    });
  };

  const handleSaveServer = (serverData: Partial<ServerConfig>) => {
    if (editingServer) {
      updateServerMutation.mutate(
        { serverId: editingServer.serverId, payload: serverData },
        {
          onSuccess: () => showToast(`Configurações de ${serverData.serverName} salvas no backend.`, "success"),
          onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Erro desconhecido ao salvar";
            showToast(`❌ Falha ao salvar ${serverData.serverName}: ${message}`, "error");
          },
        }
      );
    } else {
      addServerMutation.mutate(
        {
          url: serverData.guild?.url || "",
          name: serverData.serverName,
          logoUrl: serverData.guild?.logoUrl,
          webhookUrl: serverData.guild?.webhookUrl,
          kills: serverData.guild?.kills,
          world: serverData.guild?.world,
        },
        {
          onSuccess: (newServer) => showToast(`Novo servidor ${newServer.serverName} cadastrado no backend!`, "success"),
          onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : "Erro ao adicionar servidor";
            showToast(message, "error");
          },
        }
      );
    }
  };

  const filteredServers = servers.filter((server) =>
    !searchTerm ||
    server.serverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    server.serverId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-layout">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in bg-slate-900 border border-white/15 backdrop-blur-xl px-4 py-3 rounded-lg text-white font-medium text-xs shadow-2xl flex items-center gap-2">
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastMessage.type === 'info' && <AlertCircle className="w-4 h-4 text-blue-400" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {isApiOffline && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in bg-rose-950/90 border border-rose-500/40 backdrop-blur-xl px-4 py-2.5 rounded-lg text-rose-200 font-medium text-xs shadow-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>Não foi possível conectar à API. Os dados exibidos podem estar desatualizados.</span>
        </div>
      )}

      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        serverCount={servers.length}
        isLoadingServers={isLoadingServers}
      />

      <div className="main-content">
        <TopBar
          activeTab={activeTab}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onAddServer={handleOpenAddModal}
          onRefreshAll={handleRefreshAll}
          isRefreshing={isRefreshing}
          hasServers={servers.length > 0}
        />

        <main className="p-6 flex-1 space-y-6">
          {detailServerId ? (
            <ServerDetailView
              server={servers.find((server) => server.serverId === detailServerId)}
              events={events.filter((event) => event.serverId === detailServerId)}
              isLoadingEvents={isLoadingEvents}
              onToggleStatus={handleToggleStatus}
              onTestScrape={handleTestScrape}
              onTestWebhook={handleTestWebhook}
              onEdit={handleOpenEditModal}
              onDelete={handleRequestDeleteServer}
              isTestingScrape={testingScrapeId === detailServerId}
              isTestingWebhook={testingWebhookId === detailServerId}
            />
          ) : (
          <>
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fade-in">
              <StatCards stats={stats} isLoading={isLoadingServers} />

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Servidores Open Tibia Monitored{isLoadingServers ? "" : ` (${filteredServers.length})`}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Gerenciamento individual de guildas e parâmetros de scraping
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {isLoadingServers
                    ? Array.from({ length: 3 }).map((_, skeletonIndex) => (
                        <ServerCardSkeleton key={skeletonIndex} />
                      ))
                    : filteredServers.map((server) => (
                        <ServerCard
                          key={server.serverId}
                          server={server}
                          onToggleStatus={handleToggleStatus}
                          onTestScrape={handleTestScrape}
                          onTestWebhook={handleTestWebhook}
                          onEdit={handleOpenEditModal}
                          onDelete={handleRequestDeleteServer}
                          isTestingScrape={testingScrapeId === server.serverId}
                          isTestingWebhook={testingWebhookId === server.serverId}
                        />
                      ))}
                </div>
              </section>

              <CharacterSearch servers={servers} isLoading={isLoadingServers} initialSearch={searchTerm} />

              <LiveFeed events={events} servers={servers} isLoading={isLoadingEvents} initialSearch={searchTerm} />
            </div>
          )}

          {activeTab === "servers" && (
            <div className="space-y-6 animate-fade-in">
              <ServerConfigPanel
                servers={filteredServers}
                isLoading={isLoadingServers}
                onToggleStatus={handleToggleStatus}
                onTestScrape={handleTestScrape}
                onTestWebhook={handleTestWebhook}
                onEditServer={handleOpenEditModal}
                onDeleteServer={handleRequestDeleteServer}
                onAddServer={handleOpenAddModal}
                testingServerId={testingScrapeId}
                testingWebhookId={testingWebhookId}
              />
            </div>
          )}

          {activeTab === "characters" && (
            <div className="space-y-6 animate-fade-in">
              <CharacterSearch servers={servers} isLoading={isLoadingServers} initialSearch={searchTerm} />
            </div>
          )}

          {activeTab === "feed" && (
            <div className="space-y-6 animate-fade-in">
              <LiveFeed events={events} servers={servers} isLoading={isLoadingEvents} initialSearch={searchTerm} />
            </div>
          )}

          {activeTab === "settings" && (
            <GlobalSettingsView />
          )}
          </>
          )}
        </main>
      </div>

      <ServerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveServer}
        initialServer={editingServer}
      />

      <ConfirmDeleteServerDialog
        server={servers.find((server) => server.serverId === deleteTargetId) ?? null}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDeleteServer}
      />
    </div>
  );
}
