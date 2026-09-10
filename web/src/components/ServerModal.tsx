import React, { useState, useEffect } from "react";
import { useForm, type UseFormRegister, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const urlOrEmpty = (message: string) => z.union([z.literal(""), z.url(message)]);

const serverFormSchema = z.object({
  serverName: z.string().min(1, "Informe o nome do servidor."),
  guildUrl: z.url("Informe uma URL válida."),
  logoUrl: urlOrEmpty("Informe uma URL válida."),
  webhookUrl: urlOrEmpty("Informe uma URL válida."),
  checkInterval: z.number().min(30, "O intervalo mínimo é 30 segundos."),
  concurrency: z.number().min(1, "A concorrência mínima é 1.").max(10, "A concorrência máxima é 10."),
  requestDelay: z.number().min(100, "O delay mínimo é 100ms."),
});

type ServerFormValues = z.infer<typeof serverFormSchema>;

const discoverySchema = z.object({
  discoveryUrl: z.string().min(1, "Informe a URL do servidor."),
});

type DiscoveryFormValues = z.infer<typeof discoverySchema>;

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
  const [serverId, setServerId] = useState("");
  const [selectedDiscoveredGuild, setSelectedDiscoveredGuild] = useState<GuildDiscovered | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServerFormValues>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: {
      serverName: "",
      guildUrl: "",
      logoUrl: "",
      webhookUrl: "",
      checkInterval: 120,
      concurrency: 3,
      requestDelay: 1000,
    },
  });
  const logoUrl = watch("logoUrl");

  const {
    register: registerDiscovery,
    handleSubmit: handleSubmitDiscovery,
    reset: resetDiscoveryForm,
    formState: { errors: discoveryFormErrors },
  } = useForm<DiscoveryFormValues>({
    resolver: zodResolver(discoverySchema),
    defaultValues: { discoveryUrl: "https://www.otdbo.com.br/?subtopic=guilds" },
  });

  const discoverMutation = useMutation({
    mutationFn: (url: string) => api.discoverGuilds(url),
  });
  const isDiscovering = discoverMutation.isPending;
  const discoveredGuilds = discoverMutation.data?.guilds ?? [];
  const discoveryError = discoverMutation.isError
    ? "Erro ao efetuar scraping no servidor AAC."
    : discoverMutation.isSuccess && discoveredGuilds.length === 0
      ? "Nenhuma guilda encontrada nesta URL. Verifique se o endereço está correto."
      : null;

  useEffect(() => {
    if (initialServer) {
      setActiveTab("manual");
      setServerId(initialServer.serverId);
      reset({
        serverName: initialServer.serverName,
        guildUrl: initialServer.guild.url,
        logoUrl: initialServer.guild.logoUrl || "",
        webhookUrl: initialServer.guild.webhookUrl || "",
        checkInterval: (initialServer.settings?.checkInterval || 120000) / 1000,
        concurrency: initialServer.settings?.concurrency || 3,
        requestDelay: initialServer.settings?.requestDelay || 1000,
      });
    } else {
      setActiveTab("auto");
      setServerId("");
      reset({
        serverName: "",
        guildUrl: "",
        logoUrl: "",
        webhookUrl: "",
        checkInterval: 120,
        concurrency: 3,
        requestDelay: 1000,
      });
      setSelectedDiscoveredGuild(null);
      discoverMutation.reset();
      resetDiscoveryForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialServer, isOpen]);

  const handleDiscover = (values: DiscoveryFormValues) => {
    discoverMutation.mutate(values.discoveryUrl);
  };

  const handleSelectDiscoveredGuild = (guild: GuildDiscovered) => {
    setValue("serverName", guild.name);
    setValue("guildUrl", guild.url);
    setValue("logoUrl", guild.logoUrl || "");
    setSelectedDiscoveredGuild(guild);
  };

  const handleBackToDiscoveredList = () => {
    setSelectedDiscoveredGuild(null);
  };

  const onSaveSubmit = (values: ServerFormValues) => {
    const generatedId =
      serverId ||
      values.serverName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    onSave({
      serverId: generatedId,
      serverName: values.serverName,
      guild: {
        url: values.guildUrl,
        logoUrl: values.logoUrl || undefined,
        webhookUrl: values.webhookUrl || undefined,
        enabled: initialServer ? initialServer.guild.enabled : true,
      },
      settings: {
        checkInterval: values.checkInterval * 1000,
        concurrency: values.concurrency,
        requestDelay: values.requestDelay,
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
                <form onSubmit={handleSubmit(onSaveSubmit)} className="space-y-4">
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
                      aria-invalid={!!errors.webhookUrl}
                      className="font-mono text-xs"
                      autoFocus
                      {...register("webhookUrl")}
                    />
                    {errors.webhookUrl ? (
                      <p className="text-[11px] text-destructive">{errors.webhookUrl.message}</p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Opcional — pode deixar em branco e configurar depois em "Editar servidor".
                      </p>
                    )}
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
                  <form onSubmit={handleSubmitDiscovery(handleDiscover)} className="space-y-2">
                    <Label>URL do servidor (site do AAC)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="www.otdbo.com.br ou https://www.otdbo.com.br/?subtopic=guilds"
                        aria-invalid={!!discoveryFormErrors.discoveryUrl}
                        className="flex-1 font-mono text-xs"
                        {...registerDiscovery("discoveryUrl")}
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
                    {discoveryFormErrors.discoveryUrl ? (
                      <p className="text-[11px] text-destructive">{discoveryFormErrors.discoveryUrl.message}</p>
                    ) : (
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5 text-success" />
                        Pode colar só o domínio — o scraper testa sozinho os padrões mais comuns de página de guildas (?subtopic=guilds, /guilds.php, /guilds, etc.).
                      </p>
                    )}
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
                register={register}
                errors={errors}
                logoUrl={logoUrl}
                onSubmit={handleSubmit(onSaveSubmit)}
                onCancel={onClose}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <ServerFormFields
            register={register}
            errors={errors}
            logoUrl={logoUrl}
            onSubmit={handleSubmit(onSaveSubmit)}
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
  register: UseFormRegister<ServerFormValues>;
  errors: FieldErrors<ServerFormValues>;
  logoUrl: string;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
}

const ServerFormFields: React.FC<ServerFormFieldsProps> = ({
  register,
  errors,
  logoUrl,
  onSubmit,
  onCancel,
}) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="space-y-1.5">
      <Label>Nome do servidor / guilda *</Label>
      <Input
        type="text"
        placeholder="Ex: OTDBO - Ta DEBOREST, NTOBrasil"
        aria-invalid={!!errors.serverName}
        {...register("serverName")}
      />
      {errors.serverName && <p className="text-xs text-destructive">{errors.serverName.message}</p>}
    </div>

    <div className="space-y-1.5">
      <Label>URL da guilda (alvo do scraping) *</Label>
      <Input
        type="url"
        placeholder="https://www.otdbo.com.br/?subtopic=guilds&action=view&GuildName=..."
        className="font-mono text-xs"
        aria-invalid={!!errors.guildUrl}
        {...register("guildUrl")}
      />
      {errors.guildUrl && <p className="text-xs text-destructive">{errors.guildUrl.message}</p>}
    </div>

    <div className="space-y-1.5">
      <Label>URL da imagem / emblema da guilda (opcional)</Label>
      <div className="flex items-center gap-2">
        <Input
          type="url"
          placeholder="https://www.otdbo.com.br/guild_image.php?id=18"
          className="flex-1 font-mono text-xs"
          aria-invalid={!!errors.logoUrl}
          {...register("logoUrl")}
        />
        {logoUrl && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
            <img src={getProxiedImageUrl(logoUrl)} alt="Logo" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
      {errors.logoUrl && <p className="text-xs text-destructive">{errors.logoUrl.message}</p>}
    </div>

    <div className="space-y-1.5">
      <Label>Discord webhook URL (notificações ao vivo)</Label>
      <Input
        type="url"
        placeholder="https://discord.com/api/webhooks/ID/TOKEN"
        className="font-mono text-xs"
        aria-invalid={!!errors.webhookUrl}
        {...register("webhookUrl")}
      />
      {errors.webhookUrl && <p className="text-xs text-destructive">{errors.webhookUrl.message}</p>}
    </div>

    <div className="grid grid-cols-3 gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Intervalo (s)</Label>
        <Input
          type="number"
          min="30"
          aria-invalid={!!errors.checkInterval}
          {...register("checkInterval", { valueAsNumber: true })}
        />
        {errors.checkInterval && <p className="text-xs text-destructive">{errors.checkInterval.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Concorrência</Label>
        <Input
          type="number"
          min="1"
          max="10"
          aria-invalid={!!errors.concurrency}
          {...register("concurrency", { valueAsNumber: true })}
        />
        {errors.concurrency && <p className="text-xs text-destructive">{errors.concurrency.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Delay (ms)</Label>
        <Input
          type="number"
          min="100"
          step="100"
          aria-invalid={!!errors.requestDelay}
          {...register("requestDelay", { valueAsNumber: true })}
        />
        {errors.requestDelay && <p className="text-xs text-destructive">{errors.requestDelay.message}</p>}
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
