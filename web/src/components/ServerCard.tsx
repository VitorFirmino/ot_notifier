import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ExternalLink,
  Play,
  Pause,
  Edit2,
  Trash2,
  RefreshCw,
  Users,
  Swords,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { Separator } from "@components/ui/separator";
import { Skeleton } from "@components/ui/skeleton";
import { getProxiedImageUrl } from "@services/api";
import { getSiteHostname } from "@lib/hostname";
import { formatDuration } from "@lib/eta";
import { useSmoothedRemainingMs } from "@hooks/useSmoothedRemainingMs";
import { DiscordIcon } from "./icons/DiscordIcon";
import type { ServerConfig } from "@types";

interface ServerCardProps {
  server: ServerConfig;
  onToggleStatus: (serverId: string) => void;
  onTestScrape: (serverId: string) => void;
  onTestWebhook: (serverId: string) => void;
  onEdit: (server: ServerConfig) => void;
  onDelete: (serverId: string) => void;
  isTestingScrape?: boolean;
  isTestingWebhook?: boolean;
}

type StatusInfo = {
  label: string;
  badgeVariant: "success" | "destructive" | "warning";
  dotClassName: string;
};

const getStatusInfo = (isEnabled: boolean, isWorking: boolean): StatusInfo => {
  if (!isEnabled) {
    return { label: "Pausado", badgeVariant: "warning", dotClassName: "bg-warning" };
  }
  if (!isWorking) {
    return { label: "Inativo", badgeVariant: "destructive", dotClassName: "bg-destructive" };
  }
  return { label: "Ativo", badgeVariant: "success", dotClassName: "bg-success" };
};

export const ServerCard: React.FC<ServerCardProps> = ({
  server,
  onToggleStatus,
  onTestScrape,
  onTestWebhook,
  onEdit,
  onDelete,
  isTestingScrape = false,
  isTestingWebhook = false,
}) => {
  const navigate = useNavigate();
  const openDetail = () => navigate(`/servers/${server.serverId}`);
  const isEnabled = server.guild.enabled !== false;
  const isWorking = server.isWorking !== false;
  const status = getStatusInfo(isEnabled, isWorking);
  const characterCount = Object.keys(server.characters || {}).length;
  const onlineCount = Object.values(server.characters || {}).filter((character) => character.isOnline).length;
  const intervalSeconds = (server.settings?.checkInterval || 120000) / 1000;

  const initialSyncProgress =
    server.liveState?.processing?.isInitialSync ? server.liveState.processing : undefined;
  const isProcessing = !!initialSyncProgress;
  const remainingMs = useSmoothedRemainingMs(initialSyncProgress);
  const siteHostname = getSiteHostname(server.guild.url);

  const infoChips = [
    server.guild.webhookUrl && "Webhook",
    server.hasCloudflare && "Anti-bot",
    server.guild.world && `World: ${server.guild.world}`,
  ].filter(Boolean) as string[];

  const dimmedClasses = !isEnabled
    ? "opacity-50 grayscale-[45%] border-warning/50"
    : isProcessing
      ? "opacity-70 border-primary/40"
      : "";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetail();
        }
      }}
      className={`py-0 transition-all cursor-pointer hover:border-primary/50 ${dimmedClasses}`}
    >
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {server.guild.logoUrl ? (
              <img
                src={getProxiedImageUrl(server.guild.logoUrl)}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg border border-border object-cover bg-secondary"
                onError={(event) => {
                  (event.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Swords className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate font-heading text-sm font-medium text-foreground">
                {server.serverName}
              </h3>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {siteHostname || server.serverId} · {intervalSeconds}s
              </p>
            </div>
          </div>

          {isProcessing ? (
            <Badge variant="outline" className="shrink-0 gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Processando
            </Badge>
          ) : (
            <Badge variant={status.badgeVariant} className="shrink-0 gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`} />
              {status.label}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs">
          <a
            href={server.guild.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Ver guilda
            <ExternalLink className="h-3 w-3" />
          </a>
          {isProcessing && initialSyncProgress ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {initialSyncProgress.processed}/{initialSyncProgress.totalCharacters}
              {remainingMs !== null && <>· ~{formatDuration(remainingMs)} restante</>}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {onlineCount} / {characterCount} online
            </span>
          )}
        </div>

        {infoChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {infoChips.map((chip) => (
              <Badge key={chip} variant="secondary" className="text-muted-foreground">
                {chip}
              </Badge>
            ))}
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between gap-2" onClick={(event) => event.stopPropagation()}>
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
            <Button
              variant="secondary"
              size="sm"
              disabled={isTestingScrape}
              onClick={() => onTestScrape(server.serverId)}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTestingScrape ? "animate-spin" : ""}`} />
              {isTestingScrape ? "Testando..." : "Testar"}
            </Button>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Testar webhook do Discord"
              title="Enviar mensagem de teste para o Discord"
              disabled={isTestingWebhook}
              onClick={() => onTestWebhook(server.serverId)}
            >
              {isTestingWebhook ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <DiscordIcon className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Editar servidor"
              onClick={() => onEdit(server)}
            >
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
      </CardContent>
    </Card>
  );
};

export const ServerCardSkeleton: React.FC = () => (
  <Card className="glass-surface py-0">
    <CardContent className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const ServerConfigCardSkeleton: React.FC = () => (
  <Card className="glass-surface py-0">
    <CardContent className="flex flex-col justify-between gap-4 p-5">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-3 w-20 shrink-0" />
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-2.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-full" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5 rounded-lg border border-border bg-secondary/40 p-2">
            <Skeleton className="h-2.5 w-10" />
            <Skeleton className="h-3.5 w-16" />
          </div>
          <div className="space-y-1.5 rounded-lg border border-border bg-secondary/40 p-2">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-3.5 w-12" />
          </div>
          <div className="col-span-2 space-y-1.5 rounded-lg border border-border bg-secondary/40 p-2">
            <Skeleton className="h-2.5 w-32" />
            <Skeleton className="h-3.5 w-8" />
          </div>
        </div>

        <Skeleton className="h-6 w-full rounded-full" />
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-7 flex-1 rounded-lg" />
        <div className="flex gap-1">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
      </div>
    </CardContent>
  </Card>
);
