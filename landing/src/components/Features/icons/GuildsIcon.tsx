export const GuildsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <defs>
      <linearGradient id="guildsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--color-text)" />
        <stop offset="100%" stopColor="var(--color-accent)" />
      </linearGradient>
    </defs>
    <path stroke="url(#guildsGradient)" d="M12 7 L6 16 M12 7 L18 16 M6 16 H18" />
    <circle data-anim="dot" stroke="url(#guildsGradient)" cx="12" cy="5" r="2" />
    <circle data-anim="dot" stroke="url(#guildsGradient)" cx="6" cy="18" r="2" />
    <circle data-anim="dot" stroke="url(#guildsGradient)" cx="18" cy="18" r="2" />
  </svg>
);
