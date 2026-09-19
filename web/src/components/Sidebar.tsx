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
import { ThemeToggle } from "@components/ThemeToggle";
import logo from "@assets/logo.png";
import { authClient } from "@lib/authClient";
import { queryClient } from "@lib/queryClient";

export type NavTab = "dashboard" | "servers" | "characters" | "feed" | "settings";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  serverCount?: number;
  isLoadingServers?: boolean;
  isMobileOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  serverCount = 0,
  isLoadingServers = false,
  isMobileOpen = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const collapsed = isCollapsed && !isMobileOpen;
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut({});
    queryClient.clear();
  };

  const navItems = [
    { id: "dashboard" as NavTab, label: "Visão Geral", icon: LayoutDashboard },
    { id: "servers" as NavTab, label: "Servidores & Saúde", icon: Server, badge: !isLoadingServers && serverCount > 0 ? String(serverCount) : undefined },
    { id: "characters" as NavTab, label: "Inspetor Personagens", icon: Users },
    { id: "feed" as NavTab, label: "Alertas Ao Vivo", icon: Bell },
    { id: "settings" as NavTab, label: "Configurações", icon: Settings },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-border p-4 transition-transform duration-300 lg:relative lg:z-10 lg:translate-x-0 lg:shrink-0 lg:transition-all ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      } ${collapsed ? "w-64 lg:w-20" : "w-64"}`}
      style={{
        background:
          "linear-gradient(180deg, color-mix(in oklab, var(--sidebar) 82%, var(--primary) 18%) 0%, var(--sidebar) 45%)",
      }}
    >
      <div>
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg">
              <img src={logo} alt="OT Notifier" className="h-full w-full object-cover" />
            </div>
            {!collapsed && (
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
            className="hidden lg:inline-flex"
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
                title={collapsed ? item.label : undefined}
                className={`flex cursor-pointer items-center rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  collapsed ? "justify-center" : "justify-between"
                } ${
                  isActive
                    ? "border-primary bg-secondary text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                  {!collapsed && <span>{item.label}</span>}
                </div>
                {!collapsed && item.badge && (
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
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!collapsed && session?.user && (
            <span className="truncate text-xs text-muted-foreground" title={session.user.email}>
              {session.user.email}
            </span>
          )}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleSignOut}
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
};
