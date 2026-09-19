import { Moon, Sun } from "lucide-react";
import { useHeader } from "./hooks/use-header";
import { useThemeToggle } from "./hooks/use-theme-toggle";

const NAV_LINKS = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#recursos", label: "Recursos" },
];

export const Header: React.FC = () => {
  const { headerRef } = useHeader();
  const { theme, toggleTheme } = useThemeToggle();

  return (
    <div ref={headerRef} className="fixed inset-x-4 top-4 z-50 sm:inset-x-8">
      <header className="relative mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-3 py-3 sm:px-6">
        <span
          aria-hidden="true"
          data-header-surface
          className="glass-liquid pointer-events-none absolute inset-0 rounded-2xl border border-white/10"
        />
        <a href="/" className="relative font-heading text-base sm:text-lg">
          OT Notifier
        </a>
        <nav className="relative hidden items-center gap-8 sm:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-text-muted transition-colors hover:text-text">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="relative flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={(event) => toggleTheme(event)}
            aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-text-muted transition-colors hover:bg-white/5 hover:text-text"
          >
            {theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <a href="/app/" className="btn-glow-border ml-1">
            <span className="block px-3 py-1.5 text-sm font-medium text-text sm:px-4">
              <span className="sm:hidden">Painel</span>
              <span className="hidden sm:inline">Acessar painel</span>
            </span>
          </a>
        </div>
      </header>
    </div>
  );
};
