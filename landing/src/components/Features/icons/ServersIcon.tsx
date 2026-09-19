export const ServersIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <defs>
      <linearGradient id="serversGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--color-text)" />
        <stop offset="100%" stopColor="var(--color-accent)" />
      </linearGradient>
    </defs>
    <g stroke="url(#serversGradient)">
      <rect x="3" y="4" width="18" height="5" rx="1.5" />
      <rect x="3" y="10.5" width="18" height="5" rx="1.5" />
      <rect x="3" y="17" width="18" height="3.5" rx="1.5" />
    </g>
    <circle data-anim="light" cx="7" cy="6.5" r="1" fill="url(#serversGradient)" stroke="none" />
    <circle data-anim="light" cx="7" cy="13" r="1" fill="url(#serversGradient)" stroke="none" />
  </svg>
);
