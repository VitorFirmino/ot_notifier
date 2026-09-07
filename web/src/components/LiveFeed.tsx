import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Skull,
  Bell,
  RefreshCw,
  Search,
  Filter,
  Flame,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityEvent, EventType } from "../types";

interface LiveFeedProps {
  events: ActivityEvent[];
  isLoading: boolean;
}

const formatRelativeTime = (isoTimestamp: string): string => {
  const timestampMs = new Date(isoTimestamp).getTime();
  if (Number.isNaN(timestampMs)) return isoTimestamp;

  const diffSeconds = Math.round((timestampMs - Date.now()) / 1000);
  const divisions: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 30],
  ];

  let value = diffSeconds;
  let unit: Intl.RelativeTimeFormatUnit = "second";
  for (const [nextUnit, amount] of divisions) {
    if (Math.abs(value) < amount) {
      unit = nextUnit;
      break;
    }
    value = Math.trunc(value / amount);
    unit = nextUnit;
  }

  return new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" }).format(value, unit);
};

const EVENT_ICONS: Record<EventType, React.ReactNode> = {
  level_up: <TrendingUp className="h-4 w-4 text-success" />,
  level_down: <TrendingDown className="h-4 w-4 text-warning" />,
  death: <Skull className="h-4 w-4 text-destructive" />,
  guild_sync: <RefreshCw className="h-4 w-4 text-primary" />,
};

const EVENT_BADGE_VARIANT: Record<EventType, "success" | "warning" | "destructive" | "secondary"> = {
  level_up: "success",
  level_down: "warning",
  death: "destructive",
  guild_sync: "secondary",
};

const EVENT_LABELS: Record<EventType, string> = {
  level_up: "level up",
  level_down: "level down",
  death: "morte",
  guild_sync: "guild sync",
};

const EventRowSkeleton: React.FC = () => (
  <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-4">
    <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-3 w-full max-w-xs" />
      <div className="mt-1.5 flex items-center gap-2">
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  </div>
);

export const LiveFeed: React.FC<LiveFeedProps> = ({ events, isLoading }) => {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredEvents = events.filter((evt) => {
    const matchesFilter = filterType === "all" || evt.type === filterType;
    const matchesSearch =
      !searchQuery ||
      evt.characterName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.serverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.details?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 md:flex-row md:items-center">
          <div>
            <h3 className="flex items-center gap-2 font-heading text-base font-medium text-foreground">
              <Bell className="h-4 w-4 text-primary" />
              Feed de Atividades & Alertas Ao Vivo
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Acompanhamento em tempo real de mortes, níveis e sincronizações de guild
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar no feed..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-48 pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-9 cursor-pointer rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="all">Todos os eventos</option>
                <option value="level_up">Level up</option>
                <option value="death">Mortes</option>
                <option value="level_down">Level down</option>
                <option value="guild_sync">Guild sync</option>
              </select>
            </div>
          </div>
        </div>

        <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <EventRowSkeleton key={i} />)
          ) : filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Nenhum evento encontrado para os filtros selecionados.
            </div>
          ) : (
            filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                  {EVENT_ICONS[evt.type]}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {evt.characterName && (
                        <span className="text-sm font-medium text-foreground">{evt.characterName}</span>
                      )}

                      <Badge variant={EVENT_BADGE_VARIANT[evt.type]}>{EVENT_LABELS[evt.type]}</Badge>

                      {evt.streak && evt.streak > 1 && (
                        <Badge variant="warning" className="gap-1">
                          <Flame className="h-3 w-3" /> {evt.streak}x streak
                        </Badge>
                      )}
                    </div>

                    <span className="font-mono text-xs text-muted-foreground" title={evt.timestamp}>
                      {formatRelativeTime(evt.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">{evt.details}</p>

                  {evt.killers && evt.killers.length > 0 && (
                    <div className="mt-1 text-xs font-medium text-destructive">
                      Matadores: {evt.killers.join(", ")}
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>
                      Servidor: <strong className="text-foreground">{evt.serverName}</strong>
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
