import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Server, Save, Compass, Loader2, Image as ImageIcon, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@components/ui/tabs";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { Button } from "@components/ui/button";
import { Skeleton } from "@components/ui/skeleton";
import type { ServerConfig, GuildDiscovered } from "@types";
import { api, getProxiedImageUrl } from "@services/api";

interface ServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (serverData: Partial<ServerConfig>) => void;
  initialServer?: ServerConfig | null;
}

export const ServerModal: React.FC<ServerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialServer,
}) => {
  const [activeTab, setActiveTab] = useState<"manual" | "auto">("auto");
  const [serverName, setServerName] = useState("");
  const [serverId, setServerId] = useState("");
  const [guildUrl, setGuildUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [checkInterval, setCheckInterval] = useState(120);
  const [concurrency, setConcurrency] = useState(3);
  const [requestDelay, setRequestDelay] = useState(1000);

  const [discoveryUrl, setDiscoveryUrl] = useState("https://www.otdbo.com.br/?subtopic=guilds");
  const [selectedDiscoveredGuild, setSelectedDiscoveredGuild] = useState<GuildDiscovered | null>(null);

  const discoverMutation = useMutation({
    mutationFn: (url: string) => api.discoverGuilds(url),
  });
  const isDiscovering = discoverMutation.isPending;
  const discoveredGuilds = discoverMutation.data?.guilds ?? [];
  const discoveryError = discoverMutation.isError
    ? discoverMutation.error instanceof Error
      ? discoverMutation.error.message
      : "Erro ao efetuar scraping no servidor AAC."
    : discoverMutation.isSuccess && discoveredGuilds.length === 0
      ? "Nenhuma guilda encontrada nesta URL. Verifique se o endereço está correto."
      : null;

  useEffect(() => {
    if (initialServer) {
      setActiveTab("manual");
      setServerName(initialServer.serverName);
      setServerId(initialServer.serverId);
      setGuildUrl(initialServer.guild.url);
      setLogoUrl(initialServer.guild.logoUrl || "");
      setWebhookUrl(initialServer.guild.webhookUrl || "");
      setCheckInterval((initialServer.settings?.checkInterval || 120000) / 1000);
      setConcurrency(initialServer.settings?.concurrency || 3);
      setRequestDelay(initialServer.settings?.requestDelay || 1000);
    } else {
      setActiveTab("auto");
      setServerName("");
      setServerId("");
      setGuildUrl("");
      setLogoUrl("");
      setWebhookUrl("");
      setCheckInterval(120);
      setConcurrency(3);
      setRequestDelay(1000);
      setSelectedDiscoveredGuild(null);
      discoverMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialServer, isOpen]);

  const handleDiscover = (event: React.FormEvent) => {
    event.preventDefault();
    if (!discoveryUrl) return;
    discoverMutation.mutate(discoveryUrl);
  };

  const handleSelectDiscoveredGuild = (guild: GuildDiscovered) => {
    setServerName(guild.name);
    setGuildUrl(guild.url);
    setLogoUrl(guild.logoUrl || "");
    setSelectedDiscoveredGuild(guild);
  };

  const handleBackToDiscoveredList = () => {
    setSelectedDiscoveredGuild(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!serverName || !guildUrl) return;

    const generatedId =
      serverId ||
      serverName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    onSave({
      serverId: generatedId,
      serverName,
      guild: {
        url: guildUrl,
        logoUrl: logoUrl || undefined,
        webhookUrl: webhookUrl || undefined,
        enabled: initialServer ? initialServer.guild.enabled : true,
      },
      settings: {
        checkInterval: checkInterval * 1000,
        concurrency,
        requestDelay,
      },
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            {initialServer ? "Editar servidor OT" : "Adicionar servidor OT"}
          </DialogTitle>
        </DialogHeader>

        {!initialServer ? (
          <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as "manual" | "auto")}>
            <TabsList className="w-full">
              <TabsTrigger value="auto" className="gap-1.5">
                <Compass className="h-3.5 w-3.5" /> Auto-descoberta
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-1.5">
                <Server className="h-3.5 w-3.5" /> Cadastro manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="auto" className="space-y-4 pt-2">
              {selectedDiscoveredGuild ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="glass-surface flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
                      {selectedDiscoveredGuild.logoUrl ? (
                        <img
                          src={getProxiedImageUrl(selectedDiscoveredGuild.logoUrl)}
                          alt={selectedDiscoveredGuild.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{selectedDiscoveredGuild.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {selectedDiscoveredGuild.kills || "Ativa no servidor"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Discord webhook URL (notificações ao vivo)</Label>
                    <Input
                      type="url"
                      placeholder="https://discord.com/api/webhooks/ID/TOKEN"
                      value={webhookUrl}
                      onChange={(event) => setWebhookUrl(event.target.value)}
                      className="font-mono text-xs"
                      autoFocus
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Opcional — pode deixar em branco e configurar depois em "Editar servidor".
                    </p>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleBackToDiscoveredList}>
                      Voltar
                    </Button>
                    <Button type="submit">
                      <Save className="h-4 w-4" /> Salvar
                    </Button>
                  </DialogFooter>
                </form>
              ) : (
                <>
                  <form onSubmit={handleDiscover} className="space-y-2">
                    <Label>URL do servidor (site do AAC)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        required
                        placeholder="www.otdbo.com.br ou https://www.otdbo.com.br/?subtopic=guilds"
                        value={discoveryUrl}
                        onChange={(event) => setDiscoveryUrl(event.target.value)}
                        className="flex-1 font-mono text-xs"
                      />
                      <Button type="submit" disabled={isDiscovering}>
                        {isDiscovering ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Escaneando...
                          </>
                        ) : (
                          <>
                            <Compass className="h-4 w-4" /> Efetuar scraping
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-success" />
                      Pode colar só o domínio — o scraper testa sozinho os padrões mais comuns de página de guildas (?subtopic=guilds, /guilds.php, /guilds, etc.).
                    </p>
                  </form>

                  {discoveryError && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                      {discoveryError}
                    </div>
                  )}

                  {isDiscovering && (
                    <div className="grid max-h-60 grid-cols-2 gap-3 overflow-y-auto pr-1">
                      {Array.from({ length: 4 }).map((_, skeletonIndex) => (
                        <DiscoveredGuildSkeleton key={skeletonIndex} />
                      ))}
                    </div>
                  )}

                  {discoveredGuilds.length > 0 && !isDiscovering && (
                    <div className="space-y-2">
                      <h4 className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <span>Guildas encontradas ({discoveredGuilds.length})</span>
                        <span className="text-[10px] text-success">Clique para cadastrar</span>
                      </h4>
                      <div className="grid max-h-60 grid-cols-2 gap-3 overflow-y-auto pr-1">
                        {discoveredGuilds.map((discoveredGuild, guildIndex) => (
                          <button
                            key={guildIndex}
                            type="button"
                            onClick={() => handleSelectDiscoveredGuild(discoveredGuild)}
                            className="glass-surface flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-left"
                          >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
                              {discoveredGuild.logoUrl ? (
                                <img src={getProxiedImageUrl(discoveredGuild.logoUrl)} alt={discoveredGuild.name} className="h-full w-full object-cover" />
                              ) : (
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-foreground">{discoveredGuild.name}</div>
                              <div className="truncate text-[11px] text-muted-foreground">
                                {discoveredGuild.kills ? `${discoveredGuild.kills}` : "Ativa no servidor"}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="manual" className="pt-2">
              <ServerFormFields
                serverName={serverName}
                setServerName={setServerName}
                guildUrl={guildUrl}
                setGuildUrl={setGuildUrl}
                logoUrl={logoUrl}
                setLogoUrl={setLogoUrl}
                webhookUrl={webhookUrl}
                setWebhookUrl={setWebhookUrl}
                checkInterval={checkInterval}
                setCheckInterval={setCheckInterval}
                concurrency={concurrency}
                setConcurrency={setConcurrency}
                requestDelay={requestDelay}
                setRequestDelay={setRequestDelay}
                onSubmit={handleSubmit}
                onCancel={onClose}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <ServerFormFields
            serverName={serverName}
            setServerName={setServerName}
            guildUrl={guildUrl}
            setGuildUrl={setGuildUrl}
            logoUrl={logoUrl}
            setLogoUrl={setLogoUrl}
            webhookUrl={webhookUrl}
            setWebhookUrl={setWebhookUrl}
            checkInterval={checkInterval}
            setCheckInterval={setCheckInterval}
            concurrency={concurrency}
            setConcurrency={setConcurrency}
            requestDelay={requestDelay}
            setRequestDelay={setRequestDelay}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

const DiscoveredGuildSkeleton: React.FC = () => (
  <div className="glass-surface flex items-center gap-3 rounded-lg border border-border p-3">
    <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
    <div className="min-w-0 flex-1 space-y-1.5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

interface ServerFormFieldsProps {
  serverName: string;
  setServerName: (value: string) => void;
  guildUrl: string;
  setGuildUrl: (value: string) => void;
  logoUrl: string;
  setLogoUrl: (value: string) => void;
  webhookUrl: string;
  setWebhookUrl: (value: string) => void;
  checkInterval: number;
  setCheckInterval: (value: number) => void;
  concurrency: number;
  setConcurrency: (value: number) => void;
  requestDelay: number;
  setRequestDelay: (value: number) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
}

const ServerFormFields: React.FC<ServerFormFieldsProps> = ({
  serverName,
  setServerName,
  guildUrl,
  setGuildUrl,
  logoUrl,
  setLogoUrl,
  webhookUrl,
  setWebhookUrl,
  checkInterval,
  setCheckInterval,
  concurrency,
  setConcurrency,
  requestDelay,
  setRequestDelay,
  onSubmit,
  onCancel,
}) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="space-y-1.5">
      <Label>Nome do servidor / guilda *</Label>
      <Input
        type="text"
        required
        placeholder="Ex: OTDBO - Ta DEBOREST, NTOBrasil"
        value={serverName}
        onChange={(event) => setServerName(event.target.value)}
      />
    </div>

    <div className="space-y-1.5">
      <Label>URL da guilda (alvo do scraping) *</Label>
      <Input
        type="url"
        required
        placeholder="https://www.otdbo.com.br/?subtopic=guilds&action=view&GuildName=..."
        value={guildUrl}
        onChange={(event) => setGuildUrl(event.target.value)}
        className="font-mono text-xs"
      />
    </div>

    <div className="space-y-1.5">
      <Label>URL da imagem / emblema da guilda (opcional)</Label>
      <div className="flex items-center gap-2">
        <Input
          type="url"
          placeholder="https://www.otdbo.com.br/guild_image.php?id=18"
          value={logoUrl}
          onChange={(event) => setLogoUrl(event.target.value)}
          className="flex-1 font-mono text-xs"
        />
        {logoUrl && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
            <img src={getProxiedImageUrl(logoUrl)} alt="Logo" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
    </div>

    <div className="space-y-1.5">
      <Label>Discord webhook URL (notificações ao vivo)</Label>
      <Input
        type="url"
        placeholder="https://discord.com/api/webhooks/ID/TOKEN"
        value={webhookUrl}
        onChange={(event) => setWebhookUrl(event.target.value)}
        className="font-mono text-xs"
      />
    </div>

    <div className="grid grid-cols-3 gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Intervalo (s)</Label>
        <Input
          type="number"
          min="30"
          value={checkInterval}
          onChange={(event) => setCheckInterval(Number(event.target.value))}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Concorrência</Label>
        <Input
          type="number"
          min="1"
          max="10"
          value={concurrency}
          onChange={(event) => setConcurrency(Number(event.target.value))}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Delay (ms)</Label>
        <Input
          type="number"
          min="100"
          step="100"
          value={requestDelay}
          onChange={(event) => setRequestDelay(Number(event.target.value))}
        />
      </div>
    </div>

    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit">
        <Save className="h-4 w-4" /> Salvar
      </Button>
    </DialogFooter>
  </form>
);
