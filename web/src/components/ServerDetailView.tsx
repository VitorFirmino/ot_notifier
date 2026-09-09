import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Play,
  Pause,
  Edit2,
  Trash2,
  RefreshCw,
  Users,
  Swords,
  Shield,
  Clock,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { Separator } from "@components/ui/separator";
import { DiscordIcon } from "./icons/DiscordIcon";
import { CharacterSearch } from "./CharacterSearch";
import { LiveFeed } from "./LiveFeed";
import { getProxiedImageUrl } from "@services/api";
import { getSiteHostname } from "@lib/hostname";
import { formatDuration } from "@lib/eta";
import { useSmoothedRemainingMs } from "@hooks/useSmoothedRemainingMs";
import type { ServerConfig, ActivityEvent } from "@types";

interface ServerDetailViewProps {
  server: ServerConfig | undefined;
  events: ActivityEvent[];
  isLoadingEvents: boolean;
  onToggleStatus: (serverId: string) => void;
  onTestScrape: (serverId: string) => void;
  onTestWebhook: (serverId: string) => void;
  onEdit: (server: ServerConfig) => void;
  onDelete: (serverId: string) => void;
  isTestingScrape: boolean;
  isTestingWebhook: boolean;
}

export const ServerDetailView: React.FC<ServerDetailViewProps> = ({
  server,
  events,
  isLoadingEvents,
  onToggleStatus,
  onTestScrape,
  onTestWebhook,
  onEdit,
  onDelete,
  isTestingScrape,
  isTestingWebhook,
}) => {
  const navigate = useNavigate();

  const initialSyncProgress =
    server?.liveState?.processing?.isInitialSync ? server.liveState.processing : undefined;
  const isProcessing = !!initialSyncProgress;
  const remainingMs = useSmoothedRemainingMs(initialSyncProgress);

  if (!server) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => navigate("/servers")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Card className="py-0">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Servidor não encontrado. Ele pode ter sido removido.
          </CardContent>
        </Card>
      </div>
    );
  }

  const isEnabled = server.guild.enabled !== false;
  const isWorking = server.isWorking !== false;
  const characterCount = Object.keys(server.characters || {}).length;
  const onlineCount = Object.values(server.characters || {}).filter((character) => character.isOnline).length;
  const intervalSeconds = (server.settings?.checkInterval || 120000) / 1000;
  const siteHostname = getSiteHostname(server.guild.url);

  const statusBadge = !isEnabled
    ? { label: "Pausado", variant: "warning" as const }
    : !isWorking
      ? { label: "Inativo", variant: "destructive" as const }
      : { label: "Ativo", variant: "success" as const };

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate("/servers")}>
        <ArrowLeft className="h-4 w-4" /> Voltar para Servidores
      </Button>

      <Card className="py-0">
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {server.guild.logoUrl ? (
                <img
                  src={getProxiedImageUrl(server.guild.logoUrl)}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover bg-secondary"
                  onError={(event) => {
                    (event.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Swords className="h-6 w-6" />
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-heading text-xl font-semibold text-foreground">{server.serverName}</h1>
                  {isProcessing ? (
                    <Badge variant="outline" className="gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" /> Processando
                    </Badge>
                  ) : (
                    <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                  )}
                  {server.hasCloudflare && (
                    <Badge variant="secondary" className="gap-1 text-muted-foreground">
                      <Shield className="h-3 w-3" /> Anti-Bot
                    </Badge>
                  )}
                </div>
                <a
                  href={server.guild.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                >
                  {siteHostname || server.serverId}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="flex gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                className={!isEnabled ? "bg-success/10 text-success hover:bg-success/20" : ""}
                onClick={() => onToggleStatus(server.serverId)}
              >
                {isEnabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isEnabled ? "Pausar" : "Ativar"}
              </Button>
              <Button variant="secondary" size="sm" disabled={isTestingScrape} onClick={() => onTestScrape(server.serverId)}>
                <RefreshCw className={`h-3.5 w-3.5 ${isTestingScrape ? "animate-spin" : ""}`} />
                {isTestingScrape ? "Testando..." : "Testar"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={isTestingWebhook}
                onClick={() => onTestWebhook(server.serverId)}
              >
                {isTestingWebhook ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DiscordIcon className="h-3.5 w-3.5" />}
                {isTestingWebhook ? "Testando..." : "Testar Webhook"}
              </Button>
              <Button variant="ghost" size="icon" aria-label="Editar servidor" onClick={() => onEdit(server)}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                aria-label="Remover servidor"
                onClick={() => onDelete(server.serverId)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <span className="block text-[10px] text-muted-foreground">Status</span>
              <span className={`font-medium ${isWorking ? "text-success" : "text-destructive"}`}>
                {isWorking ? "Respondendo" : "Sem resposta"}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <span className="block text-[10px] text-muted-foreground">Intervalo</span>
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Clock className="h-3 w-3 text-muted-foreground" />
                {intervalSeconds}s
              </span>
            </div>
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <span className="block text-[10px] text-muted-foreground">Personagens</span>
              {isProcessing && initialSyncProgress ? (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {initialSyncProgress.processed}/{initialSyncProgress.totalCharacters}
                  {remainingMs !== null && <> · ~{formatDuration(remainingMs)}</>}
                </span>
              ) : (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  {onlineCount} / {characterCount} online
                </span>
              )}
            </div>
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <span className="block text-[10px] text-muted-foreground">Webhook</span>
              <span className="flex items-center gap-1 font-medium text-foreground">
                <DiscordIcon className="h-3 w-3" />
                {server.guild.webhookUrl ? "Por servidor" : "Global (.env)"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <CharacterSearch servers={[server]} isLoading={false} />

      <LiveFeed events={events} servers={[server]} isLoading={isLoadingEvents} />
    </div>
  );
};
