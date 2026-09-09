import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  UserCheck,
  UserX,
  Skull,
  ExternalLink,
  Shield,
  Flame,
  Sparkles,
  MapPin,
  Swords,
  Crown,
  Clock,
  CalendarDays,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import { Card, CardContent } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Skeleton } from "@components/ui/skeleton";
import { NativeSelect } from "@components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@components/ui/dialog";
import type { ServerConfig, CharacterInfo } from "@types";
import { api } from "@services/api";
import { getSiteHostname } from "@lib/hostname";
import { formatBrDate } from "@lib/date";

interface CharacterSearchProps {
  servers: ServerConfig[];
  isLoading: boolean;
  initialSearch?: string;
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
      {Array.from({ length: 4 }).map((_, statIndex) => (
        <div key={statIndex} className="space-y-1.5">
          <Skeleton className="h-2.5 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
    <div className="space-y-3">
      <Skeleton className="h-3 w-40" />
      <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-secondary/20 p-4">
        {Array.from({ length: 10 }).map((_, deathIndex) => (
          <Skeleton key={deathIndex} className="aspect-square rounded-lg" />
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

const MAX_CHARACTERS_PER_SERVER = 18;

const CharacterResultCard: React.FC<{ char: FoundCharacter; onSelect: (char: FoundCharacter) => void }> = ({
  char,
  onSelect,
}) => (
  <button
    onClick={() => onSelect(char)}
    className={`glass-surface flex cursor-pointer flex-col justify-between gap-2 rounded-lg border-l-4 border-y border-r border-y-border border-r-border p-4 text-left ${
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
);

export const CharacterSearch: React.FC<CharacterSearchProps> = ({ servers, isLoading, initialSearch }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch ?? "");
  useEffect(() => {
    if (initialSearch !== undefined) setSearchTerm(initialSearch);
  }, [initialSearch]);
  const [selectedCharacter, setSelectedCharacter] = useState<FoundCharacter | null>(null);
  const [deathsExpanded, setDeathsExpanded] = useState(false);
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [sortBy, setSortBy] = useState<"default" | "level_desc" | "level_asc" | "name">("default");
  const hasActiveFilters = statusFilter !== "all";
  const clearFilters = () => {
    setStatusFilter("all");
    setSortBy("default");
  };

  const toggleSection = (serverId: string) => {
    setExpandedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(serverId)) {
        next.delete(serverId);
      } else {
        next.add(serverId);
      }
      return next;
    });
  };

  const inspectQuery = useQuery({
    queryKey: ["character-inspect", selectedCharacter?.serverId, selectedCharacter?.name],
    queryFn: () =>
      api.inspectCharacter({
        name: selectedCharacter!.name,
        url: selectedCharacter!.info.url,
        serverId: selectedCharacter!.serverId,
      }),
    enabled: !!selectedCharacter,
    staleTime: 2 * 60 * 1000,
  });
  const inspecting = inspectQuery.isFetching;
  const liveDetails = inspectQuery.data ?? null;
  const inspectError = inspectQuery.isError
    ? inspectQuery.error instanceof Error
      ? inspectQuery.error.message
      : "Não foi possível carregar o perfil ao vivo do personagem."
    : null;

  const normalizedSearch = searchTerm.toLowerCase();

  const serverSections = servers
    .map((server) => {
      const characters: FoundCharacter[] = Object.entries(server.characters || {}).map(([name, info]) => ({
        name,
        serverName: server.serverName,
        serverId: server.serverId,
        info,
      }));

      const serverMatchesSearch = server.serverName.toLowerCase().includes(normalizedSearch);
      const matched = characters
        .filter(
          (item) => !normalizedSearch || serverMatchesSearch || item.name.toLowerCase().includes(normalizedSearch)
        )
        .filter((item) => {
          if (statusFilter === "online") return item.info.isOnline === true;
          if (statusFilter === "offline") return item.info.isOnline !== true;
          return true;
        })
        .sort((itemA, itemB) => {
          if (sortBy === "level_desc") return (itemB.info.last_level || 100) - (itemA.info.last_level || 100);
          if (sortBy === "level_asc") return (itemA.info.last_level || 100) - (itemB.info.last_level || 100);
          if (sortBy === "name") return itemA.name.localeCompare(itemB.name);
          return (itemB.info.isOnline ? 1 : 0) - (itemA.info.isOnline ? 1 : 0);
        });

      return {
        serverId: server.serverId,
        serverName: server.serverName,
        siteHostname: getSiteHostname(server.guild.url),
        characters: matched,
      };
    })
    .filter((section) => section.characters.length > 0);

  const totalMatched = serverSections.reduce((sum, section) => sum + section.characters.length, 0);

  const handleSelectCharacter = (char: FoundCharacter) => {
    setSelectedCharacter(char);
    setDeathsExpanded(false);
  };

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-heading text-base font-medium text-foreground">
              <Shield className="h-4 w-4 text-primary" />
              Inspetor de Personagens ao Vivo
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Varredura em tempo real no servidor para checar nível, status e mortes.
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar personagem nos servidores ativos..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-9 pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filtros:
          </div>

          <NativeSelect
            size="sm"
            value={statusFilter}
            onChange={(status) => setStatusFilter(status as "all" | "online" | "offline")}
            options={[
              { value: "all", label: "Todos os status" },
              { value: "online", label: "Só online" },
              { value: "offline", label: "Só offline" },
            ]}
          />

          <NativeSelect
            size="sm"
            value={sortBy}
            onChange={(sort) => setSortBy(sort as "default" | "level_desc" | "level_asc" | "name")}
            options={[
              { value: "default", label: "Padrão" },
              { value: "level_desc", label: "Maior nível" },
              { value: "level_asc", label: "Menor nível" },
              { value: "name", label: "Nome (A-Z)" },
            ]}
          />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs">
              <X className="h-3 w-3" /> Limpar filtros
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, skeletonIndex) => (
              <CharacterCardSkeleton key={skeletonIndex} />
            ))}
          </div>
        ) : totalMatched === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Nenhum personagem encontrado no banco de dados monitorado.
          </div>
        ) : (
          <div className="space-y-2">
            {serverSections.map((section) => {
              const onlineInSection = section.characters.filter((char) => char.info.isOnline).length;
              const isExpanded =
                normalizedSearch.length > 0 || hasActiveFilters || expandedSectionIds.has(section.serverId);
              return (
              <div key={section.serverId} className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => toggleSection(section.serverId)}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/30"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <h4 className="font-mono text-xs font-medium text-primary">{section.serverName}</h4>
                  {section.siteHostname && (
                    <span className="font-mono text-[10px] text-muted-foreground">{section.siteHostname}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {section.characters.length} {section.characters.length === 1 ? "personagem" : "personagens"}
                  </span>
                  {onlineInSection > 0 && (
                    <Badge variant="success" className="gap-1 text-[10px]">
                      <UserCheck className="h-3 w-3" /> {onlineInSection} online
                    </Badge>
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-border p-3">
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                      {section.characters.slice(0, MAX_CHARACTERS_PER_SERVER).map((char) => (
                        <CharacterResultCard key={char.name} char={char} onSelect={handleSelectCharacter} />
                      ))}
                    </div>
                    {section.characters.length > MAX_CHARACTERS_PER_SERVER && (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        +{section.characters.length - MAX_CHARACTERS_PER_SERVER} personagens neste servidor. Refine a
                        busca para encontrar um específico.
                      </p>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
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
                    {[
                      {
                        label: "Nível",
                        value: String(liveDetails.level || selectedCharacter.info.last_level || 100),
                        icon: null,
                        emphasis: "primary" as const,
                      },
                      liveDetails.vocation ? { label: "Vocação", value: liveDetails.vocation, icon: Swords } : null,
                      liveDetails.residence
                        ? { label: "Residência", value: liveDetails.residence, icon: MapPin }
                        : null,
                      liveDetails.accountStatus
                        ? {
                            label: "Conta",
                            value: liveDetails.accountStatus,
                            icon: Crown,
                            emphasis: "warning" as const,
                          }
                        : null,
                      liveDetails.lastLogin
                        ? { label: "Último login", value: formatBrDate(liveDetails.lastLogin)!, icon: Clock }
                        : null,
                      liveDetails.createdAt
                        ? { label: "Criado em", value: formatBrDate(liveDetails.createdAt)!, icon: CalendarDays }
                        : null,
                    ]
                      .filter((tile): tile is NonNullable<typeof tile> => tile !== null)
                      .map((tile) => (
                        <div key={tile.label}>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            {tile.icon && <tile.icon className="h-3 w-3" />} {tile.label}
                          </span>
                          <strong
                            className={
                              tile.emphasis === "primary"
                                ? "text-sm text-primary"
                                : tile.emphasis === "warning"
                                  ? "text-xs text-warning"
                                  : "text-xs text-foreground"
                            }
                          >
                            {tile.value}
                          </strong>
                        </div>
                      ))}
                  </div>

                  {liveDetails.deaths && liveDetails.deaths.length > 0 ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setDeathsExpanded((expanded) => !expanded)}
                        className="flex w-full cursor-pointer items-center gap-1.5 text-xs font-medium text-destructive"
                      >
                        {deathsExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <Skull className="h-4 w-4" /> Histórico de mortes ({liveDetails.deaths.length})
                      </button>
                      {deathsExpanded && (
                        <div className="space-y-2">
                          {liveDetails.deaths.map((death, idx) => (
                            <div key={idx} className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs">
                              <div className="flex items-center justify-between gap-2 font-semibold text-destructive">
                                <span>Nível {death.level}</span>
                                {death.time && <span className="font-normal text-[10px] text-muted-foreground">{death.time}</span>}
                              </div>
                              <div className="text-muted-foreground">{death.deathText}</div>
                            </div>
                          ))}
                        </div>
                      )}
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
