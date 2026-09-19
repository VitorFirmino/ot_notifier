export const IntervalIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <defs>
      <linearGradient id="intervalGradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="24">
        <stop offset="0%" stopColor="var(--color-text)" />
        <stop offset="100%" stopColor="var(--color-accent)" />
      </linearGradient>
    </defs>
    <line stroke="url(#intervalGradient)" x1="4" y1="12" x2="20" y2="12" />
    <circle data-anim="knob" fill="url(#intervalGradient)" stroke="none" cx="9" cy="12" r="3" />
  </svg>
);
