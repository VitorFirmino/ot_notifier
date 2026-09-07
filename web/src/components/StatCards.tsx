import React from "react";
import { Server, Users, Bell, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SystemStats } from "../types";

interface StatCardsProps {
  stats: SystemStats;
  isLoading: boolean;
}

type AccentColor = "primary" | "success" | "warning";

const ICON_CHIP_CLASSES: Record<AccentColor, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

const CARD_TINT_CLASSES: Record<AccentColor, string> = {
  primary: "glass-surface-primary",
  success: "glass-surface-success",
  warning: "glass-surface-warning",
};

interface StatTileProps {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: AccentColor;
  detail: React.ReactNode;
}

const StatTile: React.FC<StatTileProps> = ({ label, value, icon: Icon, accent, detail }) => (
  <Card className={`overflow-hidden py-0 ${CARD_TINT_CLASSES[accent]}`}>
    <CardContent className="flex flex-col gap-5 p-6">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${ICON_CHIP_CLASSES[accent]}`}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        <div className="font-heading text-4xl font-bold leading-none text-foreground">{value}</div>
        <div className="pt-0.5 text-xs text-muted-foreground">{detail}</div>
      </div>
    </CardContent>
  </Card>
);

const StatTileSkeleton: React.FC = () => (
  <Card className="glass-surface py-0">
    <CardContent className="flex flex-col gap-5 p-6">
      <Skeleton className="h-11 w-11 rounded-xl" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </CardContent>
  </Card>
);

export const StatCards: React.FC<StatCardsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatTileSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatTile
        label="Servidores Ativos"
        value={stats.activeWorkers}
        icon={Server}
        accent="primary"
        detail={<span className="text-success">workers on</span>}
      />

      <StatTile
        label="Jogadores Monitorados"
        value={stats.totalCharacters}
        icon={Users}
        accent="success"
        detail={<span>{stats.onlineCharacters} online</span>}
      />

      <StatTile
        label="Alertas Discord (24h)"
        value={stats.notifications24h}
        icon={Bell}
        accent="warning"
        detail={<span>disparos</span>}
      />

      <StatTile
        label="Verificações Anti-Bot"
        value={stats.cloudflareBypasses}
        icon={ShieldCheck}
        accent="primary"
        detail={<span>servidores protegidos</span>}
      />
    </div>
  );
};
