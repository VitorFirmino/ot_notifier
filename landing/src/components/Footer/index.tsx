const CURRENT_YEAR = new Date().getFullYear();

export const Footer: React.FC = () => (
  <footer className="mx-auto flex max-w-6xl justify-between px-5 pb-16 pt-8 text-sm text-text-muted sm:px-8">
    <a
      href="https://github.com/VitorFirmino/ot_notifier"
      target="_blank"
      rel="noreferrer"
      className="hover:text-accent"
    >
      GitHub
    </a>
    <span>© {CURRENT_YEAR} OT Notifier</span>
  </footer>
);
