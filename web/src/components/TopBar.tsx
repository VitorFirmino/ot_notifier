import React from "react";
import { Menu, Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";

interface TopBarProps {
  activeTab: "dashboard" | "servers" | "characters" | "feed" | "settings";
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onAddServer: () => void;
  onRefreshAll: () => void;
  isRefreshing: boolean;
  hasServers: boolean;
  onOpenMobileNav: () => void;
}

const TAB_TITLES: Record<TopBarProps["activeTab"], { main: string; sub: string }> = {
  dashboard: { main: "Dashboard Principal", sub: "Visão geral em tempo real dos servidores e eventos de guilds" },
  servers: { main: "Gerenciador de Servidores", sub: "Monitoramento de saúde, latência e configurações de captura" },
  characters: { main: "Busca de Personagens", sub: "Pesquisa avançada de jogadores em servidores OT" },
  feed: { main: "Histórico de Alertas", sub: "Feed ao vivo de mortes, níveis, entradas e saídas de guilds" },
  settings: { main: "Configurações Globais", sub: "Integração com Webhook Discord" },
};

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  searchTerm,
  onSearchChange,
  onAddServer,
  onRefreshAll,
  isRefreshing,
  hasServers,
  onOpenMobileNav,
}) => {
  const title = TAB_TITLES[activeTab];

  return (
    <header
      className="sticky top-0 z-20 flex shrink-0 flex-col flex-wrap gap-4 border-b border-border px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between"
      style={{
        background:
          "linear-gradient(90deg, color-mix(in oklab, var(--background) 85%, var(--primary) 15%) 0%, var(--background) 30%, var(--background) 70%, color-mix(in oklab, var(--background) 88%, var(--warning) 12%) 100%)",
      }}
    >
      <div className="flex items-center gap-3 shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onOpenMobileNav}
          aria-label="Abrir menu"
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground md:text-2xl">{title.main}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{title.sub}</p>
        </div>
      </div>

      <div className="relative min-w-[240px] w-full max-w-lg flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar servidor, personagem ou guilda..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-10 pl-9"
        />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden text-xs text-muted-foreground xl:inline">Feito com ❤️ por Vitor Firmino</span>
        <Button variant="outline" size="sm" onClick={onRefreshAll} disabled={isRefreshing || !hasServers}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{isRefreshing ? "Verificando..." : "Verificar Todos"}</span>
        </Button>

        <Button size="sm" onClick={onAddServer}>
          <Plus className="h-4 w-4" />
          Novo Servidor
        </Button>
      </div>

      <p className="w-full text-center text-xs text-muted-foreground md:hidden">Feito com ❤️ por Vitor Firmino</p>
    </header>
  );
};
