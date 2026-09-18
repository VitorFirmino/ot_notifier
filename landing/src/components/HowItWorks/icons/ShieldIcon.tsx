export const ShieldIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <defs>
      <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--color-text)" />
        <stop offset="100%" stopColor="var(--color-accent)" />
      </linearGradient>
    </defs>
    <path stroke="url(#shieldGradient)" d="M12 3 L19 6 V12 C19 17 15.5 20 12 21 C8.5 20 5 17 5 12 V6 Z" />
    <path data-anim="check" stroke="url(#shieldGradient)" d="M9 12 L11 14 L15 9" />
  </svg>
);
