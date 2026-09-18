import { useRadarSweep } from "./hooks/use-radar-sweep";

export const RadarSweep: React.FC = () => {
  const { svgRef } = useRadarSweep();

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 200"
      aria-hidden="true"
      className="pointer-events-none absolute -top-16 -right-16 -z-10 h-64 w-64 opacity-60"
    >
      <defs>
        <radialGradient id="radar-sweep-gradient" cx="0%" cy="0%" r="100%">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="30" fill="none" stroke="var(--color-accent)" strokeOpacity="0.15" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="var(--color-accent)" strokeOpacity="0.12" />
      <circle cx="100" cy="100" r="90" fill="none" stroke="var(--color-accent)" strokeOpacity="0.1" />
      <g data-sweep>
        <path d="M100,100 L100,10 A90,90 0 0,1 163.6,36.4 Z" fill="url(#radar-sweep-gradient)" />
      </g>
      <circle data-blip cx="140" cy="70" r="4" fill="var(--color-accent)" />
      <circle data-blip cx="60" cy="120" r="3.5" fill="var(--color-success)" />
      <circle data-blip cx="130" cy="150" r="4" fill="var(--color-accent)" />
      <circle data-blip cx="70" cy="60" r="3" fill="var(--color-danger)" />
    </svg>
  );
};
