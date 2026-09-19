import { FaInstagram } from "react-icons/fa";

const CURRENT_YEAR = new Date().getFullYear();

const PRODUCT_LINKS = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#recursos", label: "Recursos" },
  { href: "/app/", label: "Acessar painel" },
];

const LEGAL_LINKS = [
  { href: "/privacidade", label: "Política de Privacidade" },
  { href: "/termos", label: "Termos de Serviço" },
];

export const Footer: React.FC = () => (
  <footer className="mx-auto max-w-6xl border-t border-white/10 px-5 pt-12 pb-8 sm:px-8">
    <div className="grid grid-cols-1 gap-10 sm:grid-cols-[2fr_1fr]">
      <div>
        <a href="/" className="font-heading text-lg">
          OT Notifier
        </a>
        <p className="mt-3 max-w-xs leading-relaxed text-text-muted">
          Monitoramento de guildas de Open Tibia com avisos automáticos no Discord.
        </p>
      </div>
      <div>
        <h4 className="mb-3 font-medium text-text">Produto</h4>
        <ul className="space-y-2 text-text-muted">
          {PRODUCT_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition-colors hover:text-text">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
    <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
      <span>© {CURRENT_YEAR} OT Notifier. Todos os direitos reservados.</span>
      <div className="flex flex-wrap items-center gap-4">
        {LEGAL_LINKS.map((link) => (
          <a key={link.href} href={link.href} className="transition-colors hover:text-text">
            {link.label}
          </a>
        ))}
        <span>Feito por Vitor Firmino</span>
        <a
          href="https://instagram.com/vitorfirminodev"
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram de Vitor Firmino"
          className="flex items-center gap-1.5 transition-colors hover:text-text"
        >
          <FaInstagram className="h-4 w-4" />
          @vitorfirminodev
        </a>
      </div>
    </div>
  </footer>
);
