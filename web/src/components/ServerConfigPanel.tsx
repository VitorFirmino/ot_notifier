import React from "react";
import {
  Plus,
  Shield,
  Play,
  Pause,
  Edit2,
  Trash2,
  RefreshCw,
  Zap,
  Clock,
  Globe,
  Settings,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ServerCardSkeleton } from "./ServerCard";
import type { ServerConfig } from "../types";

interface ServerConfigPanelProps {
  servers: ServerConfig[];
  isLoading: boolean;
  onAddServer: () => void;
  onEditServer: (server: ServerConfig) => void;
  onToggleStatus: (serverId: string) => void;
  onDeleteServer: (serverId: string) => void;
  onTestScrape: (serverId: string) => void;
  testingServerId?: string | null;
  testingScrapeId?: string | null;
}

export const ServerConfigPanel: React.FC<ServerConfigPanelProps> = ({
  servers,
  isLoading,
  onAddServer,
  onEditServer,
  onToggleStatus,
  onDeleteServer,
  onTestScrape,
  testingServerId,
  testingScrapeId,
}) => {
  const currentTestingId = testingServerId || testingScrapeId;

  return (
    <div className="space-y-6">
      <Card className="py-0">
        <CardContent className="flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Gerenciador & Monitor de Saúde dos Servidores
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Cadastre novos servidores OT e acompanhe se a verificação e a conexão estão funcionando.
              </p>
            </div>
          </div>

          <Button onClick={onAddServer}>
            <Plus className="h-4 w-4" /> Cadastrar Novo Servidor
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <ServerCardSkeleton key={i} />)
          : servers.map((server) => {
          const isEnabled = server.guild.enabled !== false;
          const isWorking = server.isWorking !== false;
          const isTesting = currentTestingId === server.serverId;
          const characterCount = Object.keys(server.characters || {}).length;

          return (
            <Card key={server.serverId} className="py-0">
              <CardContent className="flex flex-col justify-between gap-4 p-5">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={!isEnabled ? "outline" : isWorking ? "success" : "destructive"}>
                          {!isEnabled ? "Pausado" : isWorking ? "Ativo" : "Inativo"}
                        </Badge>
                        {server.hasCloudflare && (
                          <Badge variant="secondary" className="gap-1 text-muted-foreground" title="Proteção Anti-Bot Ativa">
                            <Shield className="h-3 w-3" /> Anti-Bot
                          </Badge>
                        )}
                      </div>
                      <h3 className="mt-1.5 font-heading text-sm font-medium text-foreground">
                        {server.serverName}
                      </h3>
                    </div>

                    <span className="font-mono text-[11px] text-muted-foreground">{server.serverId}</span>
                  </div>

                  <div className="space-y-1 rounded-lg border border-border bg-secondary/40 p-2.5 text-xs">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" /> URL alvo da guilda
                    </div>
                    <a
                      href={server.guild.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate font-mono text-[11px] text-primary hover:underline"
                    >
                      {server.guild.url}
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-border bg-secondary/40 p-2">
                      <span className="block text-[10px] text-muted-foreground">Status</span>
                      <span className={`font-medium ${isWorking ? "text-success" : "text-destructive"}`}>
                        {isWorking ? "Respondendo" : "Sem resposta"}
                      </span>
                    </div>

                    <div className="rounded-lg border border-border bg-secondary/40 p-2">
                      <span className="block text-[10px] text-muted-foreground">Intervalo</span>
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {(server.settings?.checkInterval || 120000) / 1000}s
                      </span>
                    </div>

                    <div className="col-span-2 rounded-lg border border-border bg-secondary/40 p-2">
                      <span className="block text-[10px] text-muted-foreground">Personagens monitorados</span>
                      <span className="font-medium text-foreground">{characterCount}</span>
                    </div>
                  </div>

                  <Badge variant={server.guild.webhookUrl ? "secondary" : "outline"} className="w-full justify-center py-1 text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    {server.guild.webhookUrl ? "Discord Webhook Conectado" : "Webhook Global (.env) em uso"}
                  </Badge>
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    disabled={isTesting}
                    onClick={() => onTestScrape(server.serverId)}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? "animate-spin" : ""}`} />
                    {isTesting ? "Testando..." : "Testar Conexão"}
                  </Button>

                  <div className="flex gap-1">
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      aria-label={isEnabled ? "Pausar servidor" : "Ativar servidor"}
                      onClick={() => onToggleStatus(server.serverId)}
                    >
                      {isEnabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Editar servidor"
                      onClick={() => onEditServer(server)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      aria-label="Excluir servidor"
                      onClick={() => onDeleteServer(server.serverId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
