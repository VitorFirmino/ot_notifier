import React, { useState } from "react";
import {
  Search,
  UserCheck,
  UserX,
  Skull,
  ExternalLink,
  Shield,
  Flame,
  Shirt,
  Sparkles,
  MapPin,
  Swords,
  Crown,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ServerConfig, CharacterInfo, CharacterDetails } from "../types";
import { api } from "../services/api";

interface CharacterSearchProps {
  servers: ServerConfig[];
  isLoading: boolean;
}

const CharacterCardSkeleton: React.FC = () => (
  <div className="glass-surface flex flex-col justify-between gap-2 rounded-lg border-l-4 border-y border-r border-y-border border-r-border border-l-border p-4">
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="mb-2 flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <div className="flex items-center justify-between border-t border-border pt-2">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-3 w-16" />
    </div>
  </div>
);

const CharacterDetailsSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-secondary/30 p-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-2.5 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
    <div className="space-y-3">
      <Skeleton className="h-3 w-40" />
      <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-secondary/20 p-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  </div>
);

interface FoundCharacter {
  name: string;
  serverName: string;
  serverId: string;
  info: CharacterInfo;
}

const EQUIPMENT_SLOTS: { key: keyof NonNullable<CharacterDetails["equipment"]>; label: string; emoji: string }[] = [
  { key: "amulet", label: "Amuleto", emoji: "📿" },
  { key: "head", label: "Helmet", emoji: "🪖" },
  { key: "backpack", label: "Backpack", emoji: "🎒" },
  { key: "weapon", label: "Arma", emoji: "⚔️" },
  { key: "armor", label: "Armor", emoji: "🛡️" },
  { key: "shield", label: "Escudo", emoji: "🛡️" },
  { key: "ring", label: "Ring", emoji: "💍" },
  { key: "legs", label: "Legs", emoji: "🦵" },
  { key: "ammo", label: "Ammo", emoji: "🏹" },
  { key: "boots", label: "Boots", emoji: "👢" },
];

export const CharacterSearch: React.FC<CharacterSearchProps> = ({ servers, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCharacter, setSelectedCharacter] = useState<FoundCharacter | null>(null);

  const [inspecting, setInspecting] = useState(false);
  const [liveDetails, setLiveDetails] = useState<CharacterDetails | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);

  const allCharacters: FoundCharacter[] = [];
  servers.forEach((server) => {
    Object.entries(server.characters || {}).forEach(([name, info]) => {
      allCharacters.push({ name, serverName: server.serverName, serverId: server.serverId, info });
    });
  });

  const filtered = allCharacters.filter(
    (item) =>
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serverName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectCharacter = async (char: FoundCharacter) => {
    setSelectedCharacter(char);
    setInspecting(true);
    setLiveDetails(null);
    setInspectError(null);

    try {
      const details = await api.inspectCharacter({ name: char.name, url: char.info.url, serverId: char.serverId });
      setLiveDetails(details);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Não foi possível carregar o perfil ao vivo do personagem.";
      setInspectError(message);
    } finally {
      setInspecting(false);
    }
  };

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-heading text-base font-medium text-foreground">
              <Shield className="h-4 w-4 text-primary" />
              Inspetor de Personagens & Equipamentos ao Vivo
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Varredura em tempo real no servidor para checar equipamentos, nível e mortes.
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar personagem nos servidores ativos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <CharacterCardSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-muted-foreground">
              Nenhum personagem encontrado no banco de dados monitorado.
            </div>
          ) : (
            filtered.slice(0, 18).map((char) => (
              <button
                key={`${char.serverId}-${char.name}`}
                onClick={() => handleSelectCharacter(char)}
                className={`glass-surface flex flex-col justify-between gap-2 rounded-lg border-l-4 border-y border-r border-y-border border-r-border p-4 text-left ${
                  char.info.isOnline ? "border-l-success" : "border-l-border"
                }`}
              >
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{char.name}</span>
                    <Badge variant={char.info.isOnline ? "success" : "outline"} className="shrink-0 gap-1">
                      {char.info.isOnline ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                      {char.info.isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>

                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Nível: <strong className="text-primary">{char.info.last_level || 100}</strong>
                    </span>
                    {char.info.up_streak && char.info.up_streak > 0 ? (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-warning">
                        <Flame className="h-3 w-3" /> {char.info.up_streak}x streak
                      </span>
                    ) : null}
                  </div>

                  {char.info.lastDeath && (
                    <div className="mb-2 space-y-1 rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-xs">
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-destructive">
                        <Skull className="h-3 w-3" /> Última morte (nível {char.info.lastDeath.level})
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        Por: {char.info.lastDeath.killers.join(", ")}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-2 text-[10px]">
                  <span className="max-w-[150px] truncate font-mono text-muted-foreground">{char.serverName}</span>
                  <span className="font-medium text-primary">Inspecionar →</span>
                </div>
              </button>
            ))
          )}
        </div>
      </CardContent>

      <Dialog open={!!selectedCharacter} onOpenChange={(open) => !open && setSelectedCharacter(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selectedCharacter && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedCharacter.name}
                  <Badge variant={selectedCharacter.info.isOnline ? "success" : "outline"}>
                    {selectedCharacter.info.isOnline ? "Online" : "Offline"}
                  </Badge>
                </DialogTitle>
                <p className="font-mono text-xs text-primary">{selectedCharacter.serverName}</p>
              </DialogHeader>

              {inspecting && <CharacterDetailsSkeleton />}

              {inspectError && !inspecting && (
                <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" /> Falha ao inspecionar personagem
                  </div>
                  <p>{inspectError}</p>
                </div>
              )}

              {liveDetails && !inspecting && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-secondary/30 p-3 text-xs sm:grid-cols-4">
                    <div>
                      <span className="block text-[10px] text-muted-foreground">Nível</span>
                      <strong className="text-sm text-primary">
                        {liveDetails.level || selectedCharacter.info.last_level || 100}
                      </strong>
                    </div>
                    <div>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Swords className="h-3 w-3" /> Vocação
                      </span>
                      <strong className="text-xs text-foreground">{liveDetails.vocation || "Não informada"}</strong>
                    </div>
                    <div>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="h-3 w-3" /> Residência
                      </span>
                      <strong className="text-xs text-foreground">{liveDetails.residence || "Não informada"}</strong>
                    </div>
                    <div>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Crown className="h-3 w-3" /> Conta
                      </span>
                      <strong className="text-xs text-warning">{liveDetails.accountStatus || "Free Account"}</strong>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Shirt className="h-4 w-4 text-primary" />
                      Equipamentos do personagem
                    </h4>

                    {liveDetails.equipment && Object.keys(liveDetails.equipment).length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-secondary/20 p-4">
                        {EQUIPMENT_SLOTS.map(({ key, label, emoji }) => {
                          const item = liveDetails.equipment?.[key];
                          return (
                            <div
                              key={key}
                              className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-2 text-center"
                            >
                              {item?.iconUrl ? (
                                <img src={item.iconUrl} alt={label} className="h-8 w-8 object-contain" />
                              ) : (
                                <span className="text-lg">{emoji}</span>
                              )}
                              <span className="mt-1 w-full truncate text-[10px] font-medium text-muted-foreground">
                                {item?.name || label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border bg-secondary/20 p-4 text-center text-xs text-muted-foreground">
                        O servidor não exibe as imagens de equipamentos no HTML da página do perfil.
                      </div>
                    )}
                  </div>

                  {liveDetails.deaths && liveDetails.deaths.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                        <Skull className="h-4 w-4" /> Histórico de mortes recentes
                      </h4>
                      {liveDetails.deaths.map((death, idx) => (
                        <div key={idx} className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs">
                          <div className="flex items-center justify-between font-semibold text-destructive">
                            <span>Morte no nível {death.level}</span>
                          </div>
                          <div className="text-muted-foreground">
                            Por: <strong className="text-foreground">{death.killers.join(", ")}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 p-3 text-xs text-success">
                      <Sparkles className="h-4 w-4" />
                      Nenhuma morte recente registrada no perfil oficial.
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" size="sm" asChild>
                  <a href={selectedCharacter.info.url} target="_blank" rel="noopener noreferrer">
                    Abrir perfil oficial <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button size="sm" onClick={() => setSelectedCharacter(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
