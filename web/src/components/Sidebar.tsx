import React, { useState } from "react";
import {
  LayoutDashboard,
  Server,
  Users,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import logo from "@assets/logo.png";
import { authClient } from "@lib/authClient";

export type NavTab = "dashboard" | "servers" | "characters" | "feed" | "settings";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  serverCount?: number;
  isLoadingServers?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  serverCount = 0,
  isLoadingServers = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: session } = authClient.useSession();

  const navItems = [
    { id: "dashboard" as NavTab, label: "Visão Geral", icon: LayoutDashboard },
    { id: "servers" as NavTab, label: "Servidores & Saúde", icon: Server, badge: !isLoadingServers && serverCount > 0 ? String(serverCount) : undefined },
    { id: "characters" as NavTab, label: "Inspetor Personagens", icon: Users },
    { id: "feed" as NavTab, label: "Alertas Ao Vivo", icon: Bell },
    { id: "settings" as NavTab, label: "Configurações", icon: Settings },
  ];

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-border bg-sidebar p-4 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div>
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg">
              <img src={logo} alt="OT Notifier" className="h-full w-full object-cover" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-heading text-base font-semibold leading-none text-foreground">
                  OT <span className="text-primary">Notifier</span>
                </h1>
                <span className="text-xs text-muted-foreground">Open Tibia Monitor</span>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isCollapsed ? "justify-center" : "justify-between"
                } ${
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
                {!isCollapsed && item.badge && (
                  <Badge variant="secondary" className="text-muted-foreground">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-border pt-3">
        <div
          className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!isCollapsed && session?.user && (
            <span className="truncate text-xs text-muted-foreground" title={session.user.email}>
              {session.user.email}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => authClient.signOut()}
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
};
