export const HistoryIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <defs>
      <linearGradient id="historyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--color-text)" />
        <stop offset="100%" stopColor="var(--color-accent)" />
      </linearGradient>
    </defs>
    <circle stroke="url(#historyGradient)" cx="12" cy="12" r="8.5" />
    <path data-anim="hand" stroke="url(#historyGradient)" d="M12 8 V12 L15 14" />
  </svg>
);
