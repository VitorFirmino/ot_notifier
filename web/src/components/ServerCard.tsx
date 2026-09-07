import React from "react";
import {
  ExternalLink,
  Play,
  Pause,
  Edit2,
  Trash2,
  RefreshCw,
  Users,
  Swords,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { ServerConfig } from "../types";

interface ServerCardProps {
  server: ServerConfig;
  onToggleStatus: (serverId: string) => void;
  onTestScrape: (serverId: string) => void;
  onEdit: (server: ServerConfig) => void;
  onDelete: (serverId: string) => void;
  isTestingScrape?: boolean;
}

type StatusInfo = {
  label: string;
  badgeVariant: "success" | "destructive" | "outline";
  dotClassName: string;
};

const getStatusInfo = (isEnabled: boolean, isWorking: boolean): StatusInfo => {
  if (!isEnabled) {
    return { label: "Pausado", badgeVariant: "outline", dotClassName: "bg-muted-foreground" };
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
  onEdit,
  onDelete,
  isTestingScrape = false,
}) => {
  const isEnabled = server.guild.enabled !== false;
  const isWorking = server.isWorking !== false;
  const status = getStatusInfo(isEnabled, isWorking);
  const characterCount = Object.keys(server.characters || {}).length;
  const onlineCount = Object.values(server.characters || {}).filter((c) => c.isOnline).length;
  const intervalSeconds = (server.settings?.checkInterval || 120000) / 1000;

  const infoChips = [
    server.guild.webhookUrl && "Webhook",
    server.hasCloudflare && "Anti-bot",
    server.guild.world && `World: ${server.guild.world}`,
  ].filter(Boolean) as string[];

  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {server.guild.logoUrl ? (
              <img
                src={server.guild.logoUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg border border-border object-cover bg-secondary"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
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
                {server.serverId} · {intervalSeconds}s
              </p>
            </div>
          </div>

          <Badge variant={status.badgeVariant} className="shrink-0 gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`} />
            {status.label}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs">
          <a
            href={server.guild.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Ver guilda
            <ExternalLink className="h-3 w-3" />
          </a>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {onlineCount} / {characterCount} online
          </span>
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

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            <Button variant="secondary" size="sm" onClick={() => onToggleStatus(server.serverId)}>
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
