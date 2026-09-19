export const WebhookIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <defs>
      <linearGradient id="webhookGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--color-text)" />
        <stop offset="100%" stopColor="var(--color-accent)" />
      </linearGradient>
    </defs>
    <g stroke="url(#webhookGradient)">
      <rect x="3" y="3.5" width="7" height="7" rx="2" />
      <rect x="14" y="13.5" width="7" height="7" rx="2" />
      <path data-anim="arrow" d="M10 8.5 L15 15" />
    </g>
  </svg>
);
