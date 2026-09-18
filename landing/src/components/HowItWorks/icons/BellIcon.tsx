export const BellIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <defs>
      <linearGradient id="bellGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--color-text)" />
        <stop offset="100%" stopColor="var(--color-accent)" />
      </linearGradient>
    </defs>
    <g data-anim="body" stroke="url(#bellGradient)">
      <path d="M6 10 C6 6 8.5 4 12 4 C15.5 4 18 6 18 10 C18 14 19 16 20 17 H4 C5 16 6 14 6 10 Z" />
      <path d="M9.5 19 a2.5 2.5 0 0 0 5 0" />
    </g>
  </svg>
);
